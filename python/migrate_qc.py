import sqlite3
import os
import logging

logging.basicConfig(level=logging.INFO)

DB_PATH = os.path.join(os.path.dirname(__file__), 'tactabot.db')

def migrate_database_qc():
    """Add new fields for Full QC System"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        logging.info("Starting QC System Migration...")

        # 1. Users Table Updates
        logging.info("Updating users table...")
        try:
            c.execute("ALTER TABLE users ADD COLUMN trust_score REAL DEFAULT 50.0")
        except sqlite3.OperationalError: pass
        
        try:
            c.execute("ALTER TABLE users ADD COLUMN noise_score REAL DEFAULT 0.0")
        except sqlite3.OperationalError: pass
        
        try:
            c.execute("ALTER TABLE users ADD COLUMN is_elite BOOLEAN DEFAULT 0")
        except sqlite3.OperationalError: pass

        # 2. Clips Table Updates
        logging.info("Updating clips table...")
        try:
            c.execute("ALTER TABLE clips ADD COLUMN qc_stage TEXT DEFAULT 'crowd_voting'")
        except sqlite3.OperationalError: pass
        
        try:
            c.execute("ALTER TABLE clips ADD COLUMN quality_tag TEXT")
        except sqlite3.OperationalError: pass
        
        try:
            c.execute("ALTER TABLE clips ADD COLUMN final_event_type TEXT")
        except sqlite3.OperationalError: pass

        # 3. Tags Table Updates
        logging.info("Updating tags table...")
        try:
            c.execute("ALTER TABLE tags ADD COLUMN vote_weight REAL DEFAULT 1.0")
        except sqlite3.OperationalError: pass

        conn.commit()
        logging.info("✅ QC System Migration completed successfully!")
        
    except Exception as e:
        logging.error(f"❌ Migration error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database_qc()
