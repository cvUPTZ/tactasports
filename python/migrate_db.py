import sqlite3
import os
import logging

logging.basicConfig(level=logging.INFO)

DB_PATH = os.path.join(os.path.dirname(__file__), 'tactabot.db')

def migrate_database():
    """Add new fields and tables for majority vote, reputation, badges, and streak systems"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    try:
        # Add new columns to users table
        logging.info("Adding new columns to users table...")
        c.execute("ALTER TABLE users ADD COLUMN reputation INTEGER DEFAULT 100")
        c.execute("ALTER TABLE users ADD COLUMN accuracy REAL DEFAULT 0.0")
        c.execute("ALTER TABLE users ADD COLUMN last_tag_date DATE")
        c.execute("ALTER TABLE users ADD COLUMN streak_days INTEGER DEFAULT 0")
        c.execute("ALTER TABLE users ADD COLUMN tags_today INTEGER DEFAULT 0")
        
        # Create badges table
        logging.info("Creating badges table...")
        c.execute('''CREATE TABLE IF NOT EXISTS badges (
            badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            badge_type TEXT,
            awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )''')
        
        # Create clip_assignments table
        logging.info("Creating clip_assignments table...")
        c.execute('''CREATE TABLE IF NOT EXISTS clip_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            clip_id INTEGER,
            user_id INTEGER,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed BOOLEAN DEFAULT 0,
            FOREIGN KEY(clip_id) REFERENCES clips(clip_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )''')
        
        # Add new columns to clips table
        logging.info("Adding new columns to clips table...")
        c.execute("ALTER TABLE clips ADD COLUMN required_tags INTEGER DEFAULT 5")
        c.execute("ALTER TABLE clips ADD COLUMN consensus_event TEXT")
        c.execute("ALTER TABLE clips ADD COLUMN consensus_count INTEGER DEFAULT 0")
        c.execute("ALTER TABLE clips ADD COLUMN status TEXT DEFAULT 'pending'")
        
        conn.commit()
        logging.info("✅ Migration completed successfully!")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            logging.info("⚠️ Columns already exist, skipping...")
        else:
            logging.error(f"❌ Migration error: {e}")
            raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
