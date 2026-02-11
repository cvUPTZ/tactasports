# Soccer Player Heatmap Generator

Python scripts for extracting player positions from match videos and generating heatmaps.

## Installation

Install required Python packages:

```bash
pip install -r requirements.txt
```

This will install:
- `opencv-python` - Video processing
- `ultralytics` - YOLO v8 for player detection
- `numpy` - Numerical operations
- `matplotlib` - Heatmap visualization
- `scipy` - Gaussian smoothing
- `Pillow` - Image processing

## Usage

### 1. Extract Player Positions from Video

```bash
python extract_positions.py --video path/to/match.mp4 --output positions.json
```

Options:
- `--video`: Path to input video file (required)
- `--output`: Path to output JSON file (required)
- `--frame-skip`: Process every Nth frame (default: 5, higher = faster but less accurate)
- `--confidence`: Minimum detection confidence 0-1 (default: 0.5)

Example:
```bash
python extract_positions.py --video ../match.mp4 --output positions.json --frame-skip 10
```

### 2. Generate Heatmap

```bash
python generate_heatmap.py --positions positions.json --output heatmap.png --team A
```

Options:
- `--positions`: Path to positions JSON file (required)
- `--output`: Path to output PNG file (required)
- `--team`: Filter by team - 'A' or 'B' (optional, omit for both teams)
- `--sigma`: Gaussian smoothing factor (default: 3.0, higher = smoother)

Examples:
```bash
# Team A heatmap
python generate_heatmap.py --positions positions.json --output team_a.png --team A

# Team B heatmap
python generate_heatmap.py --positions positions.json --output team_b.png --team B

# Both teams
python generate_heatmap.py --positions positions.json --output both_teams.png
```

## How It Works

### Position Extraction

1. Loads video using OpenCV
2. Uses YOLO v8 to detect people in each frame
3. Estimates team based on field position (left half = Team A, right half = Team B)
4. Outputs normalized coordinates (0-100 scale) with timestamps

### Heatmap Generation

1. Loads position data from JSON
2. Creates 2D density map using histogram
3. Applies Gaussian smoothing for visual appeal
4. Overlays on professional soccer field visualization
5. Uses color gradient (yellow → orange → red) to show activity intensity

## Output Format

### positions.json
```json
{
  "video_info": {
    "total_frames": 3000,
    "fps": 30.0,
    "width": 1920,
    "height": 1080,
    "duration": 100.0
  },
  "positions": [
    {
      "frame": 0,
      "timestamp": 0.0,
      "x": 45.5,
      "y": 52.3,
      "team": "A",
      "confidence": 0.85
    }
  ]
}
```

## Performance

- Processing speed depends on video length and hardware
- Frame skipping significantly improves speed (10x faster with `--frame-skip 10`)
- GPU acceleration automatic if CUDA available
- Typical processing time: ~1-2 minutes per minute of video (with frame-skip 5)

## Troubleshooting

**"ultralytics not installed"**
- Run: `pip install ultralytics`

**"Could not open video file"**
- Check video path is correct
- Ensure video codec is supported by OpenCV

**"No positions found"**
- Try lowering `--confidence` threshold
- Check if video actually contains people
- Verify video is not corrupted

**Slow processing**
- Increase `--frame-skip` value
- Use smaller video resolution
- Ensure GPU drivers are installed for CUDA acceleration
