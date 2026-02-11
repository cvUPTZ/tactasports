import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'tactabot.db')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

try:
    # Add filename column
    c.execute("ALTER TABLE clips ADD COLUMN filename TEXT")
    print("✅ Added 'filename' column")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("⚠️ Column 'filename' already exists")
    else:
        raise

# Migrate existing video_path to filename (extract basename)
try:
    c.execute("SELECT clip_id, video_path FROM clips WHERE video_path IS NOT NULL AND filename IS NULL")
    rows = c.fetchall()
    
    for clip_id, video_path in rows:
        filename = os.path.basename(video_path)
        c.execute("UPDATE clips SET filename = ? WHERE clip_id = ?", (filename, clip_id))
    
    print(f"✅ Migrated {len(rows)} clips from video_path to filename")
except Exception as e:
    print(f"⚠️ Migration error: {e}")

conn.commit()
conn.close()
print("✅ Migration complete!")
