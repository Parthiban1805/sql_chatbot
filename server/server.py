# File: backend/app.py

import os
import sys
import logging
import bcrypt
import google.generativeai as genai
import psycopg2
from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from dotenv import load_dotenv
import jwt
import datetime
import uuid
from functools import wraps

# --- Basic Setup ---
load_dotenv()
logging.basicConfig(level=logging.DEBUG)

# --- Environment Variables ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

# --- Generative AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    generation_config=generation_config,
)

# --- Helper Functions ---
def start_chat_session():
    try:
        return model.start_chat(history=[])
    except Exception as e:
        logging.error(f"Error starting chat session: {e}")
        return None

def connect_to_db():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
        )
        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {e}")
        return None

def execute_query(query):
    query = query.replace('"', "'")
    logging.debug(f"Executing query: {query}")
    try:
        conn = connect_to_db()
        if not conn: return "Failed to connect to the database"
        
        cursor = conn.cursor()
        cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            column_names = [desc[0] for desc in cursor.description]
            results = [dict(zip(column_names, row)) for row in cursor.fetchall()]
            conn.close()
            return results
        
        conn.commit()
        conn.close()
        return []
    except Exception as e:
        logging.error(f"Error executing query: {str(e)}")
        # Rollback in case of error
        if conn:
            conn.rollback()
        return f"Error executing query: {str(e)}"
    finally:
        if conn:
            conn.close()

def generate_natural_language_response(user_query, db_results):
    try:
        chat_session = start_chat_session()
        if not chat_session: return "Error: Unable to start chat session."
        
        result_string = ', '.join([str(row) for row in db_results])
        
        prompt = f"""

            You are a chatbot that interprets SQL query results and provides natural language responses.
            The user has asked a question, and the database has returned some results.
            Your task is to generate a natural language summary of the results based on the user's query.

            Format the SQL query results as follows:
            - If there is more than two result, present the result on multiple lines.
            - For example:
            the students who scored above fifty marks are
                1.parthiban
                2.logith
                3.kumar
            - If there is only one result,like details about one particular student, present the result as usual
            but if there is results about multiple students, present the details about one student and in a new line 
            give the details about the next student.
            -if the user's expects one result in the query and the result is not available or more than result are given than 
            the user expected,then understand thee users query and find out what he wants ,instead of  dumping him all the results
            tell him the reason for not finding the results or getting more result shortly and then in the next line 
            tell the user how to give the query to get the result he wants.
            
            

            User Query: "{user_query}"
            SQL Query Results:
            {result_string}

            Now summarize the results for the user in natural language:
"""
        response = chat_session.send_message(prompt)
        return response.text.strip()
    except Exception as e:
        logging.error(f"Error generating natural language response: {str(e)}")
        return f"Error generating natural language response: {str(e)}"

# --- Flask App and JWT Decorator ---
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-super-secret-key-that-is-long-and-secure' # Replace with a secure key

# THIS IS THE CORRECTED DECORATOR
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '').strip()
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401
        
        # Pass the decoded payload as the first argument to the decorated function
        return f(data, *args, **kwargs)
    return decorated

# --- API Endpoints ---
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        conn = connect_to_db()
        if not conn:
            return jsonify({"error": "Failed to connect to the database"}), 500

        cursor = conn.cursor()
        cursor.execute("SELECT id, password FROM users WHERE email = %s;", (email,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            user_id, hashed_pw = result
            if bcrypt.checkpw(password.encode('utf-8'), hashed_pw.encode('utf-8')):
                payload = {
                    'user_id': user_id,
                    'email': email,
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                }
                token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
                return jsonify({"message": "Login successful", "token": token}), 200

        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify({"error": "An internal error occurred"}), 500

@app.route('/query', methods=['POST'])
@token_required
def generate_query(current_user): # 'current_user' is now correctly passed from the decorator
    try:
        data = request.json
        user_query = data.get('query', '')
        conversation_id = data.get('conversationId')
        
        prompt = """
You are an intelligent SQL chatbot connected to a student database management system. Your primary role is to understand natural language queries and generate accurate SQL commands while providing helpful guidance to users.

DATABASE SCHEMA:
==================
1. students table:
   - id (TEXT) - Primary Key
   - roll_no (TEXT) - Student roll number
   - name (TEXT) - Student full name
   - dept (TEXT) - Department code
   - mailid (TEXT) - Student email address
   - sem (TEXT) - Current semester
   - year (INTEGER) - Academic year
   - speciallab (TEXT) - Special lab assignment

2. subjects table:
   - id (INTEGER) - Primary Key, Auto-increment
   - exam_name (TEXT) - Type of examination
   - course_code (TEXT) - Subject course code
   - student_id (TEXT) - Foreign Key referencing students.id
   - subject_name (TEXT) - Name of the subject
   - total_mark (INTEGER) - Marks obtained

DEPARTMENT CODES:
================
- CSE: Computer Science and Engineering
- ECE: Electronics and Communication Engineering
- EIE: Electronics and Instrumentation Engineering
- MECH: Mechanical Engineering
- CIVIL: Civil Engineering
- MRTS: Mechatronics Engineering
- CSBS: Computer Science and Business Systems
- IT: Information Technology
- AGRI: Agricultural Engineering
- ISE: Information Science and Engineering
NATURAL LANGUAGE UNDERSTANDING RULES:
======================================
You must normalize user input by handling:
1. **Abbreviations & Subject Aliases**:
   - DS-1 → Data Structures-1
   - DS → Data Structures
   - MATHS / MATH → Mathematics
   - OOPS → Object Oriented Programming
   - OS → Operating Systems
   - CT1 → Cycle Test-1
   - PT1 / PT-1 / Periodic Test 1 / Test 1 → Periodical Test-1

2. **Synonyms & Field Mapping**:
   - "mark" / "marks" → "total_mark"
   - "test" → "exam_name"
   - "subject" → "subject_name"

3. **Variations**:
   - Accept case-insensitive and partial matches
   - Convert all user-provided keywords to canonical SQL-friendly values using fuzzy matching or mapping

EXAMPLES:
=========

User: "Show DS-1 mark for Parthiban in PT1"
→ Normalize to:
- subject_name LIKE '%DATA STRUCTURES-1%'
- exam_name LIKE '%PERIODICAL TEST-1%'
- total_mark

SQL:
SELECT s.total_mark FROM subjects s 
JOIN students st ON s.student_id = st.id 
WHERE st.name LIKE '%PARTHIBAN%' 
AND s.subject_name LIKE '%DATA STRUCTURES-1%' 
AND s.exam_name LIKE '%PERIODICAL TEST-1%';

User: "Get OOPS score of 7376231CS229 in test 1"
→ Normalize to:
- subject_name LIKE '%OBJECT ORIENTED PROGRAMMING%'
- exam_name LIKE '%PERIODICAL TEST-1%'
- roll_no = '7376231CS229'

SQL:
SELECT s.total_mark FROM subjects s 
JOIN students st ON s.student_id = st.id 
WHERE st.roll_no = '7376231CS229' 
AND s.subject_name LIKE '%OBJECT ORIENTED PROGRAMMING%' 
AND s.exam_name LIKE '%PERIODICAL TEST-1%';

QUERY INTERPRETATION GUIDELINES:
===============================
1. Use LIKE with wildcards (%) for partial name matches
2. Use exact matches for specific values (roll numbers, departments)
3. Always use single quotes for string values
4. Handle case-insensitive searches appropriately
5. Join tables when accessing related information
6. Use appropriate aggregate functions for calculations

COMPREHENSIVE SQL EXAMPLES:
==========================

BASIC SELECT QUERIES:
--------------------
User: "Show me all students"
SQL: SELECT * FROM students;

User: "Give me details of student Parthiban"
SQL: SELECT * FROM students WHERE name LIKE '%PARTHIBAN%';

User: "Find student with roll number 7376231CS229"
SQL: SELECT * FROM students WHERE roll_no = '7376231CS229';

User: "Show all CSE students"
SQL: SELECT * FROM students WHERE dept = 'CSE';

User: "List students in semester 3"
SQL: SELECT * FROM students WHERE sem = 'S3';

User: "Show students from mechanical department"
SQL: SELECT * FROM students WHERE dept = 'MECH';

FILTERED AND CONDITIONAL QUERIES:
---------------------------------
User: "Show CSE students in semester 5"
SQL: SELECT * FROM students WHERE dept = 'CSE' AND sem = 'S5';

User: "Find all students whose name starts with 'A'"
SQL: SELECT * FROM students WHERE name LIKE 'A%';

User: "Show students from either CSE or IT department"
SQL: SELECT * FROM students WHERE dept IN ('CSE', 'IT');

User: "List students not in ECE department"
SQL: SELECT * FROM students WHERE dept != 'ECE';

SUBJECT AND MARKS QUERIES:
-------------------------
User: "Show all subjects for student Parthiban"
SQL: SELECT s.subject_name, s.total_mark, s.exam_name FROM subjects s JOIN students st ON s.student_id = st.id WHERE st.name LIKE '%PARTHIBAN%';

User: "Get physics marks of Parthiban"
SQL: SELECT s.total_mark FROM subjects s JOIN students st ON s.student_id = st.id WHERE st.name LIKE '%PARTHIBAN%' AND s.subject_name LIKE '%PHYSICS%';

User: "Show all marks above 80"
SQL: SELECT st.name, s.subject_name, s.total_mark FROM subjects s JOIN students st ON s.student_id = st.id WHERE s.total_mark > 80;

User: "Students who scored below 50 in any subject"
SQL: SELECT DISTINCT st.name, st.roll_no FROM subjects s JOIN students st ON s.student_id = st.id WHERE s.total_mark < 50;

AGGREGATE FUNCTIONS AND CALCULATIONS:
------------------------------------
User: "Calculate total marks of Parthiban"
SQL: SELECT SUM(s.total_mark) as total_marks FROM subjects s JOIN students st ON s.student_id = st.id WHERE st.name LIKE '%PARTHIBAN%';

User: "Find average marks of Parthiban"
SQL: SELECT AVG(s.total_mark) as average_marks FROM subjects s JOIN students st ON s.student_id = st.id WHERE st.name LIKE '%PARTHIBAN%';

User: "Count total students in CSE"
SQL: SELECT COUNT(*) as total_students FROM students WHERE dept = 'CSE';

User: "Highest marks in Mathematics"
SQL: SELECT MAX(s.total_mark) as highest_mark FROM subjects s WHERE s.subject_name LIKE '%MATHEMATICS%';

User: "Department wise student count"
SQL: SELECT dept, COUNT(*) as student_count FROM students GROUP BY dept;

User: "Average marks by department"
SQL: SELECT st.dept, AVG(s.total_mark) as avg_marks FROM subjects s JOIN students st ON s.student_id = st.id GROUP BY st.dept;

RANKING AND TOP PERFORMERS:
--------------------------
User: "Top 5 students by total marks"
SQL: SELECT st.name, st.roll_no, SUM(s.total_mark) as total_marks FROM subjects s JOIN students st ON s.student_id = st.id GROUP BY st.id, st.name, st.roll_no ORDER BY total_marks DESC LIMIT 5;

User: "Students with marks above average"
SQL: SELECT st.name, s.total_mark FROM subjects s JOIN students st ON s.student_id = st.id WHERE s.total_mark > (SELECT AVG(total_mark) FROM subjects);

User: "Rank students by average marks"
SQL: SELECT st.name, AVG(s.total_mark) as avg_marks FROM subjects s JOIN students st ON s.student_id = st.id GROUP BY st.id, st.name ORDER BY avg_marks DESC;

INSERT OPERATIONS:
-----------------
User: "Add student Rahul with roll number 7376231CS230 in CSE department"
SQL: INSERT INTO students (id, roll_no, name, dept, mailid, sem) VALUES ('7376231CS230', '7376231CS230', 'RAHUL', 'CSE', 'rahul.cs23@bitsathy.ac.in', 'S1');

User: "Add marks for Parthiban in Physics - 85 marks for mid-term"
SQL: INSERT INTO subjects (student_id, subject_name, total_mark, exam_name, course_code) VALUES ((SELECT id FROM students WHERE name LIKE '%PARTHIBAN%'), 'PHYSICS', 85, 'Mid-term', 'PHY101');

UPDATE OPERATIONS:
-----------------
User: "Update Parthiban's department to IT"
SQL: UPDATE students SET dept = 'IT' WHERE name LIKE '%PARTHIBAN%';

User: "Update marks of Parthiban in Physics to 90"
SQL: UPDATE subjects SET total_mark = 90 WHERE student_id = (SELECT id FROM students WHERE name LIKE '%PARTHIBAN%') AND subject_name LIKE '%PHYSICS%';

User: "Change email of student with roll number 7376231CS229"
SQL: UPDATE students SET mailid = 'newemail@bitsathy.ac.in' WHERE roll_no = '7376231CS229';

DELETE OPERATIONS:
-----------------
User: "Delete student with roll number 7376231CS230"
SQL: DELETE FROM students WHERE roll_no = '7376231CS230';

User: "Remove all marks records for Parthiban"
SQL: DELETE FROM subjects WHERE student_id = (SELECT id FROM students WHERE name LIKE '%PARTHIBAN%');

User: "Delete students from CIVIL department"
SQL: DELETE FROM students WHERE dept = 'CIVIL';

TABLE MODIFICATION (DDL):
------------------------
User: "Add GPA column to students table"
SQL: ALTER TABLE students ADD COLUMN gpa REAL;

User: "Add phone number column"
SQL: ALTER TABLE students ADD COLUMN phone_number VARCHAR(15);

COMPLEX QUERIES:
---------------
User: "Students who haven't taken any exams"
SQL: SELECT st.* FROM students st LEFT JOIN subjects s ON st.id = s.student_id WHERE s.student_id IS NULL;

User: "Subjects where no one scored above 90"
SQL: SELECT DISTINCT subject_name FROM subjects WHERE subject_name NOT IN (SELECT subject_name FROM subjects WHERE total_mark > 90);

User: "Students with perfect attendance in all subjects"
SQL: SELECT st.name FROM students st JOIN subjects s ON st.id = s.student_id GROUP BY st.id, st.name HAVING COUNT(DISTINCT s.subject_name) >= 5;

IMPORTANT RULES:
===============
1. Always use single quotes for string literals
2. Use LIKE with % wildcards for partial matches
3. Join tables appropriately when accessing related data
4. Handle case variations in user input gracefully
5. Use appropriate aggregate functions for calculations
6. Provide meaningful column aliases for better readability
7. Consider NULL values and empty results
8. Use DISTINCT when avoiding duplicates is important
9. Always validate foreign key relationships in JOINs
10. Use appropriate ORDER BY for sorted results

ERROR HANDLING:
==============
- If query is ambiguous, ask for clarification
- For unsupported operations, suggest alternatives
- Validate data types and constraints
- Handle edge cases gracefully
- Provide helpful error messages

Remember: Generate only the SQL query without additional formatting or explanations unless specifically requested."""
        chat_session = start_chat_session()
        response = chat_session.send_message(f"{prompt}\nUser: {user_query}\nSQL:")
        generated_query = response.text.strip("```sql\n").strip().replace('`', '')
        
        results = execute_query(generated_query)
        nl_response = generate_natural_language_response(user_query, results)
        
        conn = connect_to_db()
        cursor = conn.cursor()
        
        # 'current_user' is now defined and contains the token payload
        user_id = current_user['user_id']

        new_conversation_details = {}
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            title = (user_query[:75] + '...') if len(user_query) > 75 else user_query
            new_conversation_details = {"id": conversation_id, "title": title}
        else:
            cursor.execute("SELECT title FROM chatbot_history WHERE conversation_id = %s LIMIT 1", (conversation_id,))
            title_row = cursor.fetchone()
            title = title_row[0] if title_row else "Untitled Chat"

        cursor.execute(
            "INSERT INTO chatbot_history (user_id, conversation_id, title, user_query, nl_response) VALUES (%s, %s, %s, %s, %s)",
            (user_id, conversation_id, title, user_query, nl_response)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "natural_language_response": nl_response,
            "newConversation": new_conversation_details
        })
    except Exception as e:
        logging.error(f"Error in query generation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred while processing your query."}), 500

@app.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    try:
        user_id = current_user['user_id']
        conn = connect_to_db()
        cursor = conn.cursor()
        
        # Get the most recent title for each conversation
        query = """
            SELECT DISTINCT ON (conversation_id) conversation_id, title
            FROM chatbot_history
            WHERE user_id = %s
            ORDER BY conversation_id, created_at DESC;
        """
        cursor.execute(query, (user_id,))
        conversations = [{"id": str(row[0]), "title": row[1]} for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        return jsonify(conversations)
    except Exception as e:
        logging.error(f"Error fetching conversations: {e}")
        return jsonify({"error": "Could not fetch conversations."}), 500

@app.route('/conversation/<conversation_id>', methods=['GET'])
@token_required
def get_conversation_history(current_user, conversation_id):
    try:
        user_id = current_user['user_id']
        conn = connect_to_db()
        cursor = conn.cursor()
        
        query = "SELECT user_query, nl_response FROM chatbot_history WHERE user_id = %s AND conversation_id = %s ORDER BY created_at ASC"
        cursor.execute(query, (user_id, conversation_id))
        
        messages = []
        for row in cursor.fetchall():
            if row[0]: messages.append({"type": "user", "content": row[0]})
            if row[1]: messages.append({"type": "bot", "content": row[1]})
        
        cursor.close()
        conn.close()
        return jsonify(messages)
    except Exception as e:
        logging.error(f"Error fetching conversation history: {e}")
        return jsonify({"error": "Could not fetch conversation history."}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3001)