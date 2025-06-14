import psycopg2
import bcrypt

# --- User Input ---
name = "John Doe"
email = "john@example.com"
plain_password = "strongpassword123"
role = "teacher"

# --- Hash Password ---
hashed_password = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# --- Connect to PostgreSQL ---
try:
    conn = psycopg2.connect(
        dbname="students",
        user="postgres",
        password="parthi",
        host="localhost",
        port="5432"
    )
    cursor = conn.cursor()

    # --- Insert User ---
    cursor.execute(
        """
        INSERT INTO users (name, email, password, role)
        VALUES (%s, %s, %s, %s)
        """,
        (name, email, hashed_password, role)
    )

    conn.commit()
    print("✅ User added successfully.")

except Exception as e:
    print("❌ Error:", e)

finally:
    if cursor:
        cursor.close()
    if conn:
        conn.close()
