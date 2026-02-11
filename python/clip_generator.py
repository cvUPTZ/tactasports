import cv2
import os
import random
import logging
import subprocess
import shutil

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def extract_clip_at_timestamp(video_path: str, output_path: str, timestamp_seconds: float, window_seconds: float = 10.0) -> str | None:
    """
    Extracts a short clip from a video, centered around the given timestamp.
    Uses FFMPEG for accurate seeking and fast extraction.

    Args:
        video_path: Path to the source video file.
        output_path: Path where the clip will be saved.
        timestamp_seconds: The center point of the clip in seconds.
        window_seconds: The total duration of the clip (default 10s, i.e., ±5s).

    Returns:
        The output_path if successful, None otherwise.
    """
    if not os.path.exists(video_path):
        logging.error(f"Video file not found: {video_path}")
        return None

    # Check if ffmpeg is available
    if not shutil.which('ffmpeg'):
        logging.warning("ffmpeg not found, falling back to OpenCV method.")
        return _extract_clip_opencv(video_path, output_path, timestamp_seconds, window_seconds)

    start_time = max(0, timestamp_seconds - (window_seconds / 2))
    
    # FFMPEG command for fast and accurate extraction
    # -ss before -i for fast seeking, -t for duration
    cmd = [
        'ffmpeg',
        '-y',  # Overwrite output
        '-ss', str(start_time),
        '-i', video_path,
        '-t', str(window_seconds),
        '-c:v', 'libx264',  # Re-encode for compatibility
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        output_path
    ]

    try:
        logging.info(f"Extracting clip: {start_time:.2f}s to {start_time + window_seconds:.2f}s")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            logging.error(f"FFMPEG error: {result.stderr}")
            return None
            
        logging.info(f"Successfully extracted clip to: {output_path}")
        return output_path
        
    except subprocess.TimeoutExpired:
        logging.error("FFMPEG timed out during extraction.")
        return None
    except Exception as e:
        logging.error(f"Error during clip extraction: {e}")
        return None


def _extract_clip_opencv(video_path: str, output_path: str, timestamp_seconds: float, window_seconds: float) -> str | None:
    """Fallback method using OpenCV if FFMPEG is not available."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logging.error("Could not open video with OpenCV.")
        return None

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    start_time = max(0, timestamp_seconds - (window_seconds / 2))
    start_frame = int(start_time * fps)
    end_frame = int((start_time + window_seconds) * fps)

    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    current_frame = start_frame
    while current_frame < end_frame and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        out.write(frame)
        current_frame += 1

    out.release()
    cap.release()
    
    if current_frame > start_frame:
        logging.info(f"Successfully extracted clip (OpenCV) to: {output_path}")
        return output_path
    return None

def generate_clips_from_video(video_path, output_dir, num_clips=5, min_duration=5, max_duration=12):
    """
    Generates random clips from a video file using OpenCV.
    Each clip has a random duration between min_duration and max_duration seconds.
    Returns a list of paths to the generated clips.
    """
    if not os.path.exists(video_path):
        logging.error(f"Video file not found: {video_path}")
        return []

    os.makedirs(output_dir, exist_ok=True)
    
    generated_clips = []
    logging.info(f"Generating {num_clips} clips from {video_path}...")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logging.error("Could not open video.")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if fps == 0: fps = 30.0
    
    # Calculate num_clips dynamically if requested
    if num_clips == -1:
        video_duration = total_frames / fps
        avg_clip_duration = (min_duration + max_duration) / 2
        num_clips = int(video_duration / avg_clip_duration)
        logging.info(f"Video duration: {video_duration:.2f}s. Calculated {num_clips} clips.")
        
        # Safety cap
        if num_clips > 20:
            logging.warning(f"Capping clips at 20 (calculated {num_clips})")
            num_clips = 20
        if num_clips < 1:
            num_clips = 1

    for i in range(num_clips):
        # Random clip duration between min and max
        clip_duration = random.uniform(min_duration, max_duration)
        
        # Ensure we don't go past video end
        max_start_time = (total_frames / fps) - clip_duration - 1
        if max_start_time <= 0:
            logging.warning(f"Video too short for clip duration {clip_duration}s")
            continue
            
        start_time = random.uniform(0, max_start_time)
        start_frame = int(start_time * fps)
        end_frame = int((start_time + clip_duration) * fps)
        
        clip_name = f"clip_{int(start_time)}_{random.randint(1000,9999)}.mp4"
        output_path = os.path.join(output_dir, clip_name)
        
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
    return generated_clips
