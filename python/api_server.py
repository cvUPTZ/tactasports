"""
Flask API Server for Soccer Analysis
Provides endpoints for video analysis, tracking, and metrics calculation
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import uuid
import threading
from datetime import datetime
import cv2
import numpy as np

# Import analysis modules
import sys
sys.path.append(os.path.dirname(__file__))

from detection.fusion_detector import FusionDetector
from tracking.hybrid_tracker import HybridTracker
from utils.optical_flow import OpticalFlowEngine
from utils.field_calibration import FieldCalibrator
from analytics.tactical_analytics import TacticalAnalytics

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Job storage (in production, use Redis or database)
analysis_jobs = {}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def analyze_video_task(job_id, video_path, calibration_points, models):
    """Background task for video analysis"""
    try:
        # Update job status
        analysis_jobs[job_id]['status'] = 'processing'
        analysis_jobs[job_id]['progress'] = 0
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        analysis_jobs[job_id]['total_frames'] = total_frames
        analysis_jobs[job_id]['fps'] = fps
        
        # Initialize components
        detector = FusionDetector(
            yolo_model='yolov10x.pt',
            rtdetr_model='rtdetr-x.pt',
            device='cuda' if 'cuda' in models else 'cpu'
        )
        
        tracker = HybridTracker(max_age=30, n_init=3)
        optical_flow = OpticalFlowEngine()
        
        # Field calibration
        calibrator = None
        if calibration_points and len(calibration_points) == 4:
            calibrator = FieldCalibrator()
            calibrator.calibrate(calibration_points)
        
        # Analytics
        analytics = TacticalAnalytics()
        
        # Storage for results
        tracking_data = []
        events = []
        
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect players and ball
            detections = detector.detect(frame)
            
            # Track
            tracks = tracker.update(detections, frame)
            
            # Optical flow stabilization
            if frame_idx > 0:
                flow = optical_flow.compute_flow(prev_frame, frame)
            
            # Store tracking data
            frame_data = {
                'frame': frame_idx,
                'timestamp': frame_idx / fps,
                'players': []
            }
            
            for track in tracks:
                player_data = {
                    'id': int(track['id']),
                    'team': track.get('team', 'TEAM_A'),
                    'bbox': track['bbox'].tolist(),
                    'confidence': float(track['confidence'])
                }
                
                # Convert to field coordinates if calibrated
                if calibrator:
                    center_x = (track['bbox'][0] + track['bbox'][2]) / 2
                    center_y = track['bbox'][3]  # Bottom of bbox
                    field_coords = calibrator.pixel_to_field(center_x, center_y)
                    player_data['x'] = float(field_coords[0])
                    player_data['y'] = float(field_coords[1])
                
                frame_data['players'].append(player_data)
            
            tracking_data.append(frame_data)
            
            # Update progress
            frame_idx += 1
            progress = int((frame_idx / total_frames) * 100)
            analysis_jobs[job_id]['progress'] = progress
            analysis_jobs[job_id]['current_frame'] = frame_idx
            
            prev_frame = frame.copy()
        
        cap.release()
        
        # Calculate metrics
        metrics = analytics.calculate_all_metrics(tracking_data)
        
        # Generate events from tracking data
        detected_events = analytics.detect_events(tracking_data)
        
        # Save results
        results = {
            'tracking': tracking_data,
            'events': detected_events,
            'metrics': metrics,
            'metadata': {
                'total_frames': total_frames,
                'fps': fps,
                'duration': total_frames / fps,
                'processed_at': datetime.now().isoformat()
            }
        }
        
        result_path = os.path.join(RESULTS_FOLDER, f'{job_id}.json')
        with open(result_path, 'w') as f:
            json.dump(results, f)
        
        # Update job status
        analysis_jobs[job_id]['status'] = 'completed'
        analysis_jobs[job_id]['progress'] = 100
        analysis_jobs[job_id]['results'] = results
        
    except Exception as e:
        analysis_jobs[job_id]['status'] = 'failed'
        analysis_jobs[job_id]['error'] = str(e)
        print(f"Error analyzing video: {e}")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/analyze-video', methods=['POST'])
def analyze_video():
    """
    Upload and analyze video
    
    Form data:
        - video: Video file
        - calibration: JSON string with 4 calibration points
        - models: JSON array of models to use
    """
    # Check if video file is present
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    # Save video file
    filename = secure_filename(file.filename)
    job_id = str(uuid.uuid4())
    video_filename = f"{job_id}_{filename}"
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
    file.save(video_path)
    
    # Get calibration points
    calibration_points = None
    if 'calibration' in request.form:
        try:
            calibration_points = json.loads(request.form['calibration'])
        except:
            pass
    
    # Get models
    models = ['yolov10', 'rtdetr', 'deepsort']
    if 'models' in request.form:
        try:
            models = json.loads(request.form['models'])
        except:
            pass
    
    # Create job
    analysis_jobs[job_id] = {
        'id': job_id,
        'status': 'queued',
        'progress': 0,
        'video_path': video_path,
        'created_at': datetime.now().isoformat(),
        'current_frame': 0,
        'total_frames': 0
    }
    
    # Start analysis in background thread
    thread = threading.Thread(
        target=analyze_video_task,
        args=(job_id, video_path, calibration_points, models)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'job_id': job_id,
        'status': 'queued'
    })


@app.route('/api/analysis-status/<job_id>', methods=['GET'])
def get_analysis_status(job_id):
    """Get status of analysis job"""
    if job_id not in analysis_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = analysis_jobs[job_id]
    
    response = {
        'job_id': job_id,
        'status': job['status'],
        'progress': job['progress'],
        'current_frame': job.get('current_frame', 0),
        'total_frames': job.get('total_frames', 0)
    }
    
    if job['status'] == 'completed':
        response['results'] = job.get('results')
    elif job['status'] == 'failed':
        response['error'] = job.get('error')
    
    return jsonify(response)


@app.route('/api/calculate-metrics', methods=['POST'])
def calculate_metrics():
    """
    Calculate advanced metrics from tracking data
    
    JSON body:
        - tracking_data: Array of frame tracking data
        - metrics: Array of metric names to calculate
    """
    data = request.get_json()
    
    if not data or 'tracking_data' not in data:
        return jsonify({'error': 'No tracking data provided'}), 400
    
    tracking_data = data['tracking_data']
    requested_metrics = data.get('metrics', ['xg', 'xthreat', 'vaep', 'ppda'])
    
    analytics = TacticalAnalytics()
    
    results = {}
    
    if 'xg' in requested_metrics:
        results['xg'] = analytics.calculate_xg(tracking_data)
    
    if 'xthreat' in requested_metrics:
        results['xthreat'] = analytics.calculate_xthreat(tracking_data)
    
    if 'vaep' in requested_metrics:
        results['vaep'] = analytics.calculate_vaep(tracking_data)
    
    if 'ppda' in requested_metrics:
        results['ppda'] = analytics.calculate_ppda(tracking_data)
    
    return jsonify(results)


@app.route('/api/results/<job_id>', methods=['GET'])
def get_results(job_id):
    """Get full results for a completed job"""
    result_path = os.path.join(RESULTS_FOLDER, f'{job_id}.json')
    
    if not os.path.exists(result_path):
        return jsonify({'error': 'Results not found'}), 404
    
    with open(result_path, 'r') as f:
        results = json.load(f)
    
    return jsonify(results)


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """List all analysis jobs"""
    jobs = []
    for job_id, job in analysis_jobs.items():
        jobs.append({
            'id': job_id,
            'status': job['status'],
            'progress': job['progress'],
            'created_at': job['created_at']
        })
    
    return jsonify({'jobs': jobs})


if __name__ == '__main__':
    print("🚀 Starting Soccer Analysis API Server...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"📁 Results folder: {RESULTS_FOLDER}")
    print("🌐 Server running on http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
