import os
import sys
import logging
import  bcrypt
import google.generativeai as genai
import psycopg2
import jwt

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
import datetime

app = Flask(__name__)

load_dotenv()
logging.basicConfig(level=logging.DEBUG)
JWT_SECRET = os.getenv("JWT_SECRET")
FLASK_SECRET = os.getenv("FLASK_SECRET")

app.secret_key = FLASK_SECRET  # Set Flask secret key
JWT_ALGORITHM = "HS256"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
genai.configure(api_key=GEMINI_API_KEY)

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",
    generation_config=generation_config,
)

def start_chat_session():
    try:
        return model.start_chat(history=[])
    except Exception as e:
        logging.error(f"Error starting chat session: {e}")
        return None

def connect_to_db():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        logging.error(f"Error connecting to database: {e}")
        return None

def execute_query(query):
    # Replace double quotes with single quotes
    query = query.replace('"', "'")
    
    logging.debug(f"Executing query: {query}")
    
    try:
        conn = connect_to_db()
        if not conn:
            return "Failed to connect to the database"
        
        cursor = conn.cursor()
        cursor.execute(query)
        
        # Check if it's a SELECT query
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            # Convert results to list of dictionaries
            column_names = [desc[0] for desc in cursor.description]
            results_dict = [dict(zip(column_names, row)) for row in results]
            conn.close()
            return results_dict
        
        conn.commit()
        conn.close()
        return []
    except Exception as e:
        logging.error(f"Error executing query: {str(e)}")
        return f"Error executing query: {str(e)}"

def generate_natural_language_response(user_query, db_results):
    """
    Generate a natural language response using the Gemini chatbot.
    """
    try:
        chat_session = start_chat_session()
        if not chat_session:
            return "Error: Unable to start chat session."
        
        # Format the database results as a string
        result_string = ', '.join([str(row) for row in db_results])
        
        # Define the prompt
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
            -if the user's the users query is to get the details of one student but the result contains the details of two or more students then 
            you should give the name of the first a student in the new line  and his image url in the new line and then in the next line give the name of the second student in the new line and his image url in the new line
            and so on and ask the user which student he wants to know the details of.            
            

            User Query: "{user_query}"
            SQL Query Results:
            {result_string}

            Now summarize the results for the user in natural language:
"""

        
    
        
        
        # Generate the response
        logging.debug("Generating natural language response...")
        response = chat_session.send_message(prompt)
        return response.text.strip()
    
    except Exception as e:
        logging.error(f"Error generating natural language response: {str(e)}")
        return f"Error generating natural language response: {str(e)}"

CORS(app)

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        conn = connect_to_db()
        if not conn:
            return jsonify({"error": "Failed to connect to the database"}), 500

        cursor = conn.cursor()
        cursor.execute("SELECT id, password, role FROM users WHERE email = %s;", (email,))
        result = cursor.fetchone()

        if result and bcrypt.checkpw(password.encode('utf-8'), result[1].encode('utf-8')):
            user_id, _, role = result  # Extract user ID and role

            # Create JWT token
            payload = {
                "id": user_id,
                "email": email,
                "role": role,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)  # Token expiry time
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

            return jsonify({"message": "Login successful", "token": token}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/query', methods=['POST'])
def generate_query():
    try:
        user_query = request.json.get('query', '')
        logging.debug(f"Received user query: {user_query}")
        
        # Predefined prompt
        prompt = """
        You are a chatbot connected to a student database. Your job is to understand user queries and generate appropriate SQL commands to manage the data.
        You should interpret user input acurately especially while it come to deleting records, identify the type of operation (e.g., SELECT, INSERT, UPDATE, DELETE, ALTER), and generate the correct SQL query.
        Provide clear, concise, and respectful feedback for unsupported or invalid queries.
        Ensure that the queries align with the structure and purpose of the database, and guide the user on how to phrase their requests if needed.
        students table:
        - id(TEXT)
        - roll_no (TEXT)
        - name (TEXT)
        - dept (TEXT)
        - mailid (TEXT)
        - sem(TEXT)
        - images(TEXT)
        subjects table:
        - id (INTEGER, Primary Key)
        - exam_name(TEXT)
        - course_code(TEXT)
        - student_id (INTEGER, Foreign Key referencing students.id)
        - subject_name (TEXT)
        - total_mark (INTEGER)
        
        the example of the students table record is this
        example:
        
        7376231CS229	MONISHADHITH B S	CSE	22CS303	COMPUTER ORGANIZATION AND ARCHITECTURE	Periodical Test - I	S3	29	monishadhith.cs23@bitsathy.ac.in
        thses are some examples of the student's roll_no name dept course_code subject_name exam_name sem total_mark mailid	
        and these are the departments CSE ECE EIE(which means Electronics and Instrumentation Engineering) MECH(which means mechanics) 
        CIVIL MTRS(which means mechatronics ) CSBS(which means computer science and bussiness system) IT AGRI ISE(which means information science and engineering)
        here some of the details are in upper case and some are in lower case but when the user gives the query you should give query in relevant case
        Examples:
            1. User: Give me the details about the student Parthiban.
            SQL: SELECT * FROM students WHERE name LIKE 'PARTHIBAN%';
            2. User: Show all students in the Computer Science department.
            SQL: SELECT * FROM students WHERE dept = 'COMPUTER SCIENCE';
            3. User: List students in their final year.
            SQL: SELECT * FROM students WHERE year = 4;
            4. User: Add a student named Parthiban in 2nd year with roll number 7376231CD124 and computer science and engineering dept  to the database.
            SQL: INSERT INTO students (roll_no, name, dept, mailid, year, speciallab) VALUES ('7376231CD124', 'PARTHIBAN', 'CSE', 'parthiban@example.com', 2, NULL);
            5. User: Update the department of the student with roll number 7376231CD124 to Mechanical Engineering.
            SQL: UPDATE students SET dept = 'MECH' WHERE roll_no = '7376231CD124';
            6. User: Delete the student with roll number 7376231CD124 from the database.
            SQL: DELETE FROM students WHERE roll_no = '7376231CD124';
            7. User: Alter the table to add a new column named "GPA" with type REAL.
            SQL: ALTER TABLE students ADD COLUMN GPA REAL;
            8. User:Give me the mark of student named Parthiban.
            SQL: SELECT s.marks 
                FROM subjects s 
                JOIN students st ON s.student_id = st.id 
                WHERE st.name = 'PARTHIBAN';

            9. User:Physics mark of student Parthiban.
            SQL: SELECT s.marks 
                    FROM subjects s 
                    JOIN students st ON s.student_id = st.id 
                    WHERE st.name = 'PARTHIBAN' AND s.subject_name = 'PHYSICS';

            10. User: Calculate the sum and average marks of Parthiban.
            SQL: SELECT SUM(s.marks) AS total_marks, AVG(s.marks) AS average_marks 
                    FROM subjects s 
                    JOIN students st ON s.student_id = st.id 
                    WHERE st.name = 'PARTHIBAN';
        Always use single quotes for string values in SQL queries.

        """
        
        # Start chat session
        logging.debug("Starting chat session...")
        chat_session = start_chat_session()
        if not chat_session:
            return jsonify({"error": "Could not start chat session"}), 500
        
        # Generate SQL query
        logging.debug("Sending message to AI model to generate SQL query...")
        response = chat_session.send_message(f"{prompt}\nUser: {user_query}\nSQL:")
        
        # Extract SQL query
        generated_query = response.text.strip("```sql\n").strip()
        logging.debug(f"Generated SQL query: {generated_query}")
        
        # Execute query
        results = execute_query(generated_query)
        logging.debug(f"Query execution results: {results}")
        
        # Generate natural language response
        nl_response = generate_natural_language_response(user_query, results)
        logging.debug(f"NLP execution results: {nl_response}")

        return jsonify({
            "query": generated_query,
            "results": results,
            "natural_language_response": nl_response
        })
    
    except Exception as e:
        logging.error(f"Error in query generation: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3001)