import os
import shutil
import json
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import base64
import cv2
import numpy as np
from typing import Optional

# Global analyzer instance for single-frame detection
_global_analyzer = None

def get_analyzer():
    global _global_analyzer
    if _global_analyzer is None and SoccerMatchAnalyzer:
        config = AnalysisConfig(confidence_threshold=0.3)
        _global_analyzer = SoccerMatchAnalyzer(config)
        _global_analyzer.load_model()
        _global_analyzer.load_roboflow_model()
    return _global_analyzer

# Import analysis modules
try:
    from soccer_analysis_processor import SoccerMatchAnalyzer, AnalysisConfig
except Exception as e:
    print(f"Error: Could not import soccer_analysis_processor: {e}")
    import traceback
    traceback.print_exc()
    # Mock for testing if modules missing
    SoccerMatchAnalyzer = None

# Check GPU availability
import torch
if torch.cuda.is_available():
    print(f"✅ GPU Detected: {torch.cuda.get_device_name(0)}")
else:
    print("⚠️  No GPU detected! Running on CPU.")

app = FastAPI(title="Soccer Analysis API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "soccer-analysis-api"}

@app.post("/analyze")
async def analyze_match(
    video: UploadFile = File(...),
    clips: str = Form(None),
    generate_video: bool = Form(False),
    conf: float = Form(0.3)
):
    if not SoccerMatchAnalyzer:
        raise HTTPException(status_code=500, detail="Analysis modules not loaded")

    try:
        # Create temp directory
        temp_dir = Path("temp_uploads")
        temp_dir.mkdir(exist_ok=True)
        
        # Save uploaded video
        video_path = temp_dir / video.filename
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        print(f"Received video: {video.filename}, Size: {os.path.getsize(video_path)} bytes")
        
        # Parse clips
        clips_data = None
        if clips:
            try:
                clips_data = json.loads(clips)
                print(f"Processing {len(clips_data)} clips")
            except json.JSONDecodeError:
                print("Invalid clips JSON")
        
        # Run Analysis
        print("Starting analysis...")
        config = AnalysisConfig(confidence_threshold=conf)
        analyzer = SoccerMatchAnalyzer(config)
        
        results = analyzer.analyze(
            video_path=str(video_path),
            clips=clips_data
        )
        
        # Cleanup
        if video_path.exists():
            os.remove(video_path)
            
        return {"success": True, "results": results}

    except Exception as e:
        print(f"Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/api/detect-players")
async def detect_players_endpoint(
    image: str = Form(...),
    homography: Optional[str] = Form(None),
    high_contrast: bool = Form(False)
):
    """Detect players in a single frame and project them onto the pitch."""
    analyzer = get_analyzer()
    if analyzer is None:
        raise HTTPException(status_code=500, detail="Analysis modules not loaded")

    try:
        print(f"📥 Received detect-players request. High contrast: {high_contrast}")
        analyzer.config.use_high_contrast_colors = high_contrast
        # Decode base64 image
        header, encoded = image.split(",", 1) if "," in image else (None, image)
        image_data = base64.b64decode(encoded)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            print("❌ Error: Failed to decode image")
            raise ValueError("Failed to decode image")

        print(f"🖼️ Decoded image size: {frame.shape}")

        # Setup homography if provided
        if homography:
            print(f"🗺️ Setting up homography: {homography[:50]}...")
            from soccer_analysis_core import HomographyTransform
            analyzer.homography = HomographyTransform.from_string(homography)

        # Run single frame detection
        print("🔍 Running detection...")
        if analyzer.roboflow_model:
            print("✨ Using Roboflow model")
            detections = analyzer.roboflow_model.get_detections(frame, confidence=analyzer.config.confidence_threshold)
            boxes = detections.xyxy
            confs = detections.confidence
            cls_ids = detections.class_id
            
            final_results = []
            for bbox, conf, cls_id in zip(boxes, confs, cls_ids):
                final_results.append({
                    'bbox': bbox,
                    'conf': conf,
                    'cls': cls_id
                })
        else:
            print("🚀 Using local YOLO model")
            results = analyzer.model.predict(
                frame,
                conf=analyzer.config.confidence_threshold,
                classes=[0, 32], # Person and Ball
                verbose=False
            )
            
            final_results = []
            for result in results:
                boxes = result.boxes.xyxy.cpu().numpy()
                confs = result.boxes.conf.cpu().numpy()
                cls_ids = result.boxes.cls.cpu().numpy().astype(int)
                for bbox, conf, cls_id in zip(boxes, confs, cls_ids):
                    final_results.append({
                        'bbox': bbox,
                        'conf': conf,
                        'cls': cls_id
                    })

        print(f"✅ Found {len(final_results)} objects")
        players = []
        for detection in final_results:
            x1, y1, x2, y2 = detection['bbox']
            conf = detection['conf']
            cls_id = detection['cls']
            
            # Bottom-center for feet-level projection
            foot_x, foot_y = float((x1 + x2) / 2), float(y2)
            
            # Transform to meters
            xm, ym = None, None
            if analyzer.homography and analyzer.homography.enabled:
                xm, ym = analyzer.homography.transform(foot_x, foot_y)
            
            players.append({
                "id": len(players) + 1,
                "bbox": [float(x1), float(y1), float(x2), float(y2)],
                "center": [foot_x, foot_y],
                "pitch_coords": [xm, ym] if xm is not None else None,
                "team": "BALL" if cls_id == 32 else "Unknown",
                "confidence": float(conf),
                "cls": int(cls_id)
            })

        return {"success": True, "players": players}

    except Exception as e:
        print(f"❌ Detection failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "traceback": traceback.format_exc()}
        )


# --- CROWD ANNOTATION ENDPOINTS ---
from pydantic import BaseModel
from typing import Optional
import sqlite3

class CrowdReviewRequest(BaseModel):
    video_path: str
    timestamp_seconds: float
    event_type: Optional[str] = None  # Optional pre-tag by analyst
    match_name: Optional[str] = "Unknown Match"
    window_seconds: float = 10.0

# Path to TactaBot database
TACTABOT_DB = Path(__file__).parent / "tactabot.db"
CLIPS_DIR = Path(__file__).parent.parent / "public" / "clips"
UPLOADS_DIR = Path(__file__).parent.parent / "public" / "uploads"

@app.post("/api/crowd/request-review-upload")
async def request_crowd_review_upload(
    video: UploadFile = File(...),
    timestamp_seconds: float = Form(...),
    match_name: str = Form("Unknown Match"),
    window_seconds: float = Form(10.0),
    event_type: Optional[str] = Form(None)
):
    """
    Analyst-triggered endpoint to send a specific moment to the crowd for annotation.
    Accepts video file upload.
    """
    try:
        from clip_generator import extract_clip_at_timestamp
        
        # Save uploaded video to temp location with unique name to avoid Windows locks/collisions
        import uuid
        temp_uuid = uuid.uuid4().hex[:8]
        temp_video_path = UPLOADS_DIR / f"temp_{temp_uuid}_{video.filename}"
        
        with open(temp_video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Generate unique clip filename
        import uuid
        clip_filename = f"crowd_{int(timestamp_seconds)}_{uuid.uuid4().hex[:8]}.mp4"
        CLIPS_DIR.mkdir(parents=True, exist_ok=True)
        output_path = CLIPS_DIR / clip_filename
        
        # Extract the clip
        print(f"📹 Extracting clip at {timestamp_seconds}s from {temp_video_path}")
        result = extract_clip_at_timestamp(
            str(temp_video_path),
            str(output_path),
            timestamp_seconds,
            window_seconds
        )
        
        # Cleanup temp video
        if temp_video_path.exists():
            os.remove(temp_video_path)
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to extract clip")
        
        # Add to TactaBot database
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            c.execute("INSERT OR IGNORE INTO matches (name) VALUES (?)", (match_name,))
            c.execute("SELECT match_id FROM matches WHERE name = ? ORDER BY match_id DESC LIMIT 1", (match_name,))
            match_id = c.fetchone()[0]
            
            c.execute('''
                INSERT INTO clips (match_id, filename, qc_stage, status, required_tags, is_priority, pre_tag)
                VALUES (?, ?, 'crowd_voting', 'pending', 10, 1, ?)
            ''', (match_id, clip_filename, event_type))
            clip_id = c.lastrowid
            conn.commit()
        
        print(f"✅ Clip added to crowd queue: {clip_filename} (ID: {clip_id})")
        
        return {
            "success": True,
            "clip_id": clip_id,
            "clip_filename": clip_filename,
            "message": f"Clip sent to crowd for annotation. Minimum 10 votes required for consensus."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Crowd review request failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.post("/api/crowd/request-review")
async def request_crowd_review(request: CrowdReviewRequest):
    """
    Analyst-triggered endpoint to send a specific moment to the crowd for annotation.
    
    Workflow:
    1. Analyst tags a timestamp as "ambiguous" or "needs review"
    2. This endpoint extracts a 10s clip around that timestamp
    3. The clip is added to the TactaBot queue for fan voting
    4. Results come back through the bot's consensus mechanism
    """
    try:
        from clip_generator import extract_clip_at_timestamp
        
        # Validate video path
        video_path = Path(request.video_path)
        if not video_path.exists():
            raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")
        
        # Generate unique clip filename
        import uuid
        clip_filename = f"crowd_{int(request.timestamp_seconds)}_{uuid.uuid4().hex[:8]}.mp4"
        CLIPS_DIR.mkdir(parents=True, exist_ok=True)
        output_path = CLIPS_DIR / clip_filename
        
        # Extract the clip
        print(f"📹 Extracting clip at {request.timestamp_seconds}s from {video_path}")
        result = extract_clip_at_timestamp(
            str(video_path),
            str(output_path),
            request.timestamp_seconds,
            request.window_seconds
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to extract clip")
        
        # Add to TactaBot database
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            
            # Create or get match
            c.execute("INSERT OR IGNORE INTO matches (name) VALUES (?)", (request.match_name,))
            c.execute("SELECT match_id FROM matches WHERE name = ? ORDER BY match_id DESC LIMIT 1", (request.match_name,))
            match_id = c.fetchone()[0]
            
            # Insert clip for crowd voting
            c.execute('''
                INSERT INTO clips (match_id, filename, qc_stage, status, required_tags, is_priority, pre_tag)
                VALUES (?, ?, 'crowd_voting', 'pending', 10, 1, ?)
            ''', (match_id, clip_filename, request.event_type))
            clip_id = c.lastrowid
            conn.commit()
        
        print(f"✅ Clip added to crowd queue: {clip_filename} (ID: {clip_id})")
        
        return {
            "success": True,
            "clip_id": clip_id,
            "clip_filename": clip_filename,
            "message": f"Clip sent to crowd for annotation. Minimum 10 votes required for consensus."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Crowd review request failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@app.get("/api/crowd/status/{clip_id}")
async def get_crowd_status(clip_id: int):
    """Check the voting status of a clip in the crowd queue."""
    try:
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            
            # Get clip info
            c.execute('''
                SELECT c.clip_id, c.filename, c.qc_stage, c.status, c.consensus_event,
                       (SELECT COUNT(*) FROM tags WHERE clip_id = c.clip_id) as vote_count,
                       c.required_tags
                FROM clips c WHERE c.clip_id = ?
            ''', (clip_id,))
            row = c.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail=f"Clip not found: {clip_id}")
            
            # Get vote breakdown
            c.execute('''
                SELECT event_type, COUNT(*) as count
                FROM tags WHERE clip_id = ?
                GROUP BY event_type
                ORDER BY count DESC
            ''', (clip_id,))
            votes = {row[0]: row[1] for row in c.fetchall()}
            
        return {
            "success": True,
            "clip_id": row[0],
            "filename": row[1],
            "stage": row[2],
            "status": row[3],
            "consensus_event": row[4],
            "vote_count": row[5],
            "required_votes": row[6],
            "vote_breakdown": votes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@app.get("/api/community/leaderboard")
async def get_leaderboard():
    try:
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            c.execute("SELECT COALESCE(nickname, username, 'Analyst ' || user_id), xp FROM users ORDER BY xp DESC LIMIT 10")
            overall = [{"nickname": r[0], "xp": r[1]} for r in c.fetchall()]
            
            c.execute("SELECT COALESCE(nickname, username, 'Analyst ' || user_id), monthly_xp FROM users ORDER BY monthly_xp DESC LIMIT 10")
            monthly = [{"nickname": r[0], "xp": r[1]} for r in c.fetchall()]
            
        return {"success": True, "overall": overall, "monthly": monthly}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/community/clubs")
async def get_club_rankings():
    try:
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            c.execute('''
                SELECT club, SUM(xp) as total_xp, COUNT(user_id) as members 
                FROM users 
                WHERE club IS NOT NULL 
                GROUP BY club 
                ORDER BY total_xp DESC
            ''')
            clubs = [{"name": r[0], "xp": r[1], "members": r[2]} for r in c.fetchall()]
            
        return {"success": True, "clubs": clubs}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

@app.get("/api/community/user/{user_id}")
async def get_user_stats(user_id: int):
    try:
        with sqlite3.connect(TACTABOT_DB) as conn:
            c = conn.cursor()
            c.execute("SELECT COALESCE(nickname, username, 'Analyst ' || user_id), xp, monthly_xp, streak_days, trust_score, club FROM users WHERE user_id = ?", (user_id,))
            row = c.fetchone()
            if not row:
                return {"success": False, "error": "User not found"}
            
            c.execute("SELECT badge_type FROM badges WHERE user_id = ?", (user_id,))
            badges = [b[0] for b in c.fetchall()]
            
        return {
            "success": True,
            "stats": {
                "nickname": row[0],
                "xp": row[1],
                "monthly_xp": row[2],
                "streak": row[3],
                "trust": row[4],
                "club": row[5],
                "badges": badges
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
