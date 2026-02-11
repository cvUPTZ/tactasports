import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
import subprocess
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
def health_check():
    return {"status": "online", "provider": "Vast.ai"}

@app.post("/analyze")
async def analyze_match(
    video: UploadFile = File(...),
    clips: str = Form(None)
):
    try:
        # Save uploaded video
        video_path = UPLOAD_DIR / f"video_{video.filename}"
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        logger.info(f"Video received: {video_path}")

        # Save clips config if provided
        clips_path = None
        if clips:
            clips_path = UPLOAD_DIR / f"clips_{video.filename}.json"
            with open(clips_path, "w") as f:
                f.write(clips)
            logger.info(f"Clips config received: {clips_path}")

        # Output path
        output_path = UPLOAD_DIR / f"results_{video.filename}.json"

        # Construct command
        cmd = [
            "python", "analyze_match.py",
            "--video", str(video_path),
            "--output", str(output_path)
        ]
        
        if clips_path:
            cmd.extend(["--clips", str(clips_path)])

        # Run analysis
        logger.info(f"Running analysis: {' '.join(cmd)}")
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )

        # Cleanup input files
        if video_path.exists():
            os.remove(video_path)
        if clips_path and clips_path.exists():
            os.remove(clips_path)

        if process.returncode != 0:
            logger.error(f"Analysis failed: {process.stderr}")
            return HTTPException(status_code=500, detail=f"Analysis failed: {process.stderr}")

        # Read results
        if not output_path.exists():
            return HTTPException(status_code=500, detail="Analysis output file not found")

        with open(output_path, "r") as f:
            results = json.load(f)

        # Cleanup output
        os.remove(output_path)

        return {"success": True, "results": results}

    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
