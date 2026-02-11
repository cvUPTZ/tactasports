import sqlite3
import os
import sys
from tactabot import get_db, ensure_user_exists, calculate_crowd_consensus, init_db, DB_PATH

def test_get_db():
    print("Testing get_db context manager...")
    conn_obj = None
    with get_db() as conn:
        conn_obj = conn
        c = conn.cursor()
        c.execute("SELECT 1")
        print("  Query executed successfully.")
    
    # Check if connection is closed
    try:
        conn_obj.execute("SELECT 1")
        print("❌ Connection was NOT closed!")
    except sqlite3.ProgrammingError:
        print("✅ Connection closed successfully.")

def test_ensure_user_exists():
    print("\nTesting ensure_user_exists...")
    test_user_id = 999999
    ensure_user_exists(test_user_id, "testuser")
    
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT username, trust_score FROM users WHERE user_id=?", (test_user_id,))
        row = c.fetchone()
        if row and row[0] == "testuser" and row[1] == 50:
            print("✅ User created successfully.")
        else:
            print(f"❌ User creation failed: {row}")

def test_consensus_locking():
    print("\nTesting consensus locking (basic run)...")
    # Just ensure it doesn't crash with the new BEGIN IMMEDIATE
    try:
        calculate_crowd_consensus(1)
        print("✅ Consensus calculation ran without error.")
    except Exception as e:
        print(f"❌ Consensus calculation failed: {e}")

if __name__ == "__main__":
    # Ensure DB exists
    if not os.path.exists(DB_PATH):
        init_db()
        
    test_get_db()
    test_ensure_user_exists()
    test_consensus_locking()
