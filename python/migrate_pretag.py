import sqlite3
import os

DB_PATH = 'python/tactabot.db'

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        c.execute("ALTER TABLE clips ADD COLUMN pre_tag TEXT")
        conn.commit()
        print("Successfully added pre_tag column to clips table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column pre_tag already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
