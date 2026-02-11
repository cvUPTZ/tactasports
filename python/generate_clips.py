import json
import os
import subprocess
import random
import sqlite3
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANALYSIS_FILE = os.path.join(BASE_DIR, 'analysis_results.json')
CLIPS_DIR = os.path.join(BASE_DIR, 'public', 'clips')
DB_PATH = os.path.join(os.path.dirname(__file__), 'tactabot.db')

import cv2

def generate_clips():
    # 1. Load Analysis Results
    if not os.path.exists(ANALYSIS_FILE):
        logging.error(f"Analysis file not found: {ANALYSIS_FILE}")
        return

    with open(ANALYSIS_FILE, 'r') as f:
        data = json.load(f)

    video_path = data.get('metadata', {}).get('video_path')
    if not video_path or not os.path.exists(video_path):
        logging.warning(f"Video path from analysis not found: {video_path}")
        # Find latest mp4 in public/uploads
        uploads_dir = os.path.join(BASE_DIR, 'public', 'uploads')
        if os.path.exists(uploads_dir):
            files = [os.path.join(uploads_dir, f) for f in os.listdir(uploads_dir) if f.endswith('.mp4')]
            if files:
                video_path = max(files, key=os.path.getctime)
                logging.info(f"Using latest video found: {video_path}")
            else:
                logging.error("No .mp4 files found in public/uploads")
                return
        else:
            logging.error(f"Uploads directory not found: {uploads_dir}")
            return

    # 2. Create Clips Directory
    os.makedirs(CLIPS_DIR, exist_ok=True)

    # 3. Generate Random Clips using OpenCV
    duration = data.get('metadata', {}).get('duration', 60)
    num_clips = 5
    clip_duration = 4 # seconds
    
    generated_clips = []

    logging.info(f"Generating {num_clips} clips from {video_path} using OpenCV...")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logging.error("Could not open video.")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if fps == 0: fps = 30.0

    for i in range(num_clips):
        start_time = random.uniform(0, (total_frames / fps) - clip_duration - 1)
        start_frame = int(start_time * fps)
        end_frame = int((start_time + clip_duration) * fps)
        
        clip_name = f"clip_{int(start_time)}.mp4"
        output_path = os.path.join(CLIPS_DIR, clip_name)
        
        # Setup VideoWriter
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        current_frame = start_frame
        while current_frame < end_frame and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            current_frame += 1
            
        out.release()
        logging.info(f"Generated: {clip_name}")
        generated_clips.append(output_path)

    cap.release()

    # 4. Update Database
    if generated_clips:
        update_db(generated_clips)

def update_db(clip_paths):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Ensure match exists
    c.execute("SELECT match_id FROM matches WHERE name = ?", ("Production Match",))
    match = c.fetchone()
    if not match:
        c.execute("INSERT INTO matches (name, status) VALUES (?, ?)", ("Production Match", "live"))
        match_id = c.lastrowid
    else:
        match_id = match[0]

    # Insert clips
    for path in clip_paths:
        # We store the absolute path for the bot to send
        c.execute("INSERT INTO clips (match_id, video_path, correct_event) VALUES (?, ?, ?)", 
                  (match_id, path, "Unknown"))
    
    conn.commit()
    conn.close()
    logging.info(f"Inserted {len(clip_paths)} clips into database.")

if __name__ == "__main__":
    generate_clips()
