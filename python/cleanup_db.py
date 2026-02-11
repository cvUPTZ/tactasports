import sqlite3
import os

DB_PATH = 'python/tactabot.db'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Show current clips
print("Current clips in database:")
c.execute('SELECT clip_id, match_id, video_path FROM clips')
for row in c.fetchall():
    print(f"  ID {row[0]}: Match {row[1]} - {row[2]}")

# Delete dummy HTTP clips
c.execute('DELETE FROM clips WHERE video_path LIKE "http%"')
deleted = c.rowcount
conn.commit()

print(f"\nDeleted {deleted} dummy clips")

# Show remaining clips
print("\nRemaining clips:")
c.execute('SELECT clip_id, match_id, video_path FROM clips')
for row in c.fetchall():
    exists = "✓" if os.path.exists(row[2]) else "✗"
    print(f"  {exists} ID {row[0]}: {os.path.basename(row[2])}")

conn.close()
