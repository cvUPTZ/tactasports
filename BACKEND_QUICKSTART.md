# Python Backend API - Quick Start Guide

## 🚀 Démarrage

### Windows
```bash
# Double-cliquez sur:
start-api-server.bat
```

### Manuel
```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r python/requirements.txt
cd python
python api_server.py
```

## 📡 API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze-video` - Upload & analyze video
- `GET /api/analysis-status/:jobId` - Get analysis progress
- `POST /api/calculate-metrics` - Calculate advanced metrics
- `GET /api/results/:jobId` - Get full results
- `GET /api/jobs` - List all jobs

## 🔧 Configuration

- **Port**: 5000
- **Max file size**: 2GB
- **Formats**: MP4, AVI, MOV, MKV
- **Models**: YOLOv10, RT-DETR, DeepSORT

## 📊 Workflow

1. Frontend uploads video → `/api/analyze-video`
2. Backend returns `job_id`
3. Frontend polls `/api/analysis-status/:jobId`
4. Backend processes (detect, track, calibrate, metrics)
5. Frontend receives results

Serveur disponible sur: **http://localhost:5000**
