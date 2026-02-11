# Soccer Controller Log - Real-Time Match Analysis System

A comprehensive web application for real-time soccer match event logging, video analysis, and synchronized multi-device viewing with gamepad support.

## 🎯 Overview

This application enables coaches, analysts, and scouts to log match events in real-time using gamepad controllers, upload and analyze match videos with AI-powered tracking, and synchronize playback across multiple devices. It features voice recognition, smart player selection, tactical analysis, and real-time audio/video broadcasting.

## ✨ Key Features

### 📊 Real-Time Event Logging
- **Gamepad Control**: Log events using Xbox/PlayStation controllers
- **Voice Recognition**: Hands-free event logging with voice commands
- **Smart Player Selection**: AI-assisted player identification with D-pad navigation
- **Event Types**: Goals, passes, fouls, shots, possession changes, substitutions, and more
- **Live Sync**: Events broadcast instantly to all connected viewers

### 🎥 Video Analysis
- **Video Upload**: Upload match videos for synchronized playback
- **AI Tracking**: Automatic player detection and tracking
- **Heatmaps**: Generate team and player position heatmaps
- **Speed Analysis**: Calculate player speeds and sprint detection
- **Passing Predictions**: AI-powered passing lane analysis
- **Tactical Alerts**: Real-time tactical situation detection

### 🎮 Gamepad Features
- **Zoom & Pan**: R2/L2 for zoom, right stick for pan control
- **Event Logging**: Quick event logging with mapped buttons
- **Player Selection**: D-pad navigation for selecting players
- **Customizable Mappings**: Remap buttons to your preference

### 🔄 Multi-Device Synchronization
- **Broadcaster/Viewer Roles**: One broadcaster, multiple viewers
- **Video Sync**: Play, pause, seek synchronized across all devices
- **Event Sync**: Events appear on all connected devices instantly
- **Team Data Sync**: Roster and team information shared automatically
- **Audio Broadcasting**: Real-time audio commentary via WebRTC

### 📈 Analysis & Visualization
- **Event Timeline**: Visual timeline of all match events
- **Player Statistics**: Individual player performance metrics
- **Team Analytics**: Team-level tactical analysis
- **Export Data**: Export events and analysis to JSON/CSV

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd soccer-controller-log-main
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Install Python dependencies**
```bash
cd python
pip install -r requirements.txt
cd ..
```

4. **Create required directories**
```bash
mkdir -p public/uploads
mkdir -p public/heatmaps
mkdir -p public/analysis
```

### Running the Application

1. **Start the backend server**
```bash
npm run server
```
Server will run on `http://localhost:3003`

2. **Start the frontend development server**
```bash
npm run dev
```
Frontend will run on `http://localhost:5173`

3. **Access the application**
- **Broadcaster**: Open `http://localhost:5173` on the main device
- **Viewers**: Open `http://localhost:5173` on additional devices (same network)

## 🎮 Gamepad Setup

### Supported Controllers
- Xbox One/Series Controllers
- PlayStation 4/5 DualShock/DualSense
- Generic USB/Bluetooth gamepads

### Default Button Mappings

| Button | Function |
|--------|----------|
| A (Cross) | Confirm/Select |
| B (Circle) | Cancel |
| X (Square) | Pass Event |
| Y (Triangle) | Shot Event |
| LB | Previous Player |
| RB | Next Player |
| LT | Zoom Out |
| RT | Zoom In |
| D-Pad | Navigate Player Selection |
| Left Stick | Navigate UI |
| Right Stick | Pan Video (when zoomed) |
| Start | Toggle Match Timer |
| Select | Open Settings |

### Customizing Mappings
1. Click the **Settings** icon in the top-right
2. Navigate to **Gamepad Settings**
3. Click on any button to remap
4. Press the desired button on your controller
5. Click **Save Mappings**

## 📹 Video Upload & Analysis

### Uploading Videos

1. Click **Upload Video** in the video mode section
2. Select your match video file (MP4, AVI, MOV supported)
3. Video will upload to server and become available to all viewers
4. Use playback controls to navigate through the video

### Running AI Analysis

1. Upload a video first
2. Click the **Settings** icon on the video player
3. Configure analysis options:
   - **Full Video**: Analyze entire video with real-time tracking
   - **Event Clips**: Analyze only logged event clips (±5 seconds)
   - **Generate Video**: Create annotated video with overlays
4. Click **Run Analysis**
5. Wait for processing (may take several minutes)
6. View results with player tracking, heatmaps, and tactical insights

### Analysis Features

- **Player Tracking**: Bounding boxes around detected players
- **Speed Calculation**: Real-time speed display for each player
- **Sprint Detection**: Highlights when players are sprinting
- **Passing Predictions**: Shows likely passing targets
- **Tactical Alerts**: Notifications for offsides, pressing, counter-attacks
- **Heatmaps**: Position density visualization

## 🔊 Voice Commands

Enable voice recognition to log events hands-free:

### Supported Commands
- "Goal" - Log a goal
- "Pass" - Log a pass
- "Shot" - Log a shot attempt
- "Foul" - Log a foul
- "Corner" - Log a corner kick
- "Throw-in" - Log a throw-in
- "Offside" - Log an offside
- "Substitution" - Log a player substitution
- "Yellow card" - Log a yellow card
- "Red card" - Log a red card

### Enabling Voice Recognition
1. Click the **microphone icon** in the header
2. Allow microphone permissions when prompted
3. Speak commands clearly
4. Commands will be logged automatically

## 📱 Multi-Device Setup

### Broadcaster Setup
1. Open the app on your main device
2. You'll automatically be assigned as **Broadcaster**
3. Upload team rosters (JSON format)
4. Upload match video (optional)
5. Start logging events

### Viewer Setup
1. Open the app on additional devices
2. Ensure devices are on the same network
3. You'll automatically be assigned as **Viewer**
4. All events and video playback will sync automatically

### Network Configuration
- Devices must be on the same local network
- Firewall may need to allow port 3003
- For remote access, configure port forwarding or use ngrok

## 📊 Team Roster Format

Upload team rosters in JSON format:

```json
{
  "teamName": "Team Name",
  "players": [
    {
      "number": 10,
      "name": "Player Name",
      "position": "Forward",
      "isStarting": true
    }
  ]
}
```

### Roster Features
- **Starting Lineup**: Mark starting XI
- **Substitutes**: Track bench players
- **Player Selection**: Quick selection during events
- **Position Tracking**: Record player positions

## 🛠️ Technical Architecture

### Frontend Stack
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Socket.IO Client** for real-time communication
- **WebRTC** for audio/video streaming

### Backend Stack
- **Node.js** with Express
- **Socket.IO** for WebSocket communication
- **Multer** for file uploads
- **Python** for AI analysis

### AI/ML Components
- **YOLOv8** for player detection
- **ByteTrack** for player tracking
- **OpenCV** for video processing
- **NumPy/Pandas** for data analysis

## 📁 Project Structure

```
soccer-controller-log-main/
├── src/
│   ├── components/       # React components
│   │   ├── VideoPlayer/  # Video player with AI overlays
│   │   ├── EventLog/     # Event logging interface
│   │   ├── Dashboard/    # Analytics dashboard
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useGamepad.ts # Gamepad integration
│   │   ├── useVoiceRecognition.ts
│   │   └── ...
│   ├── pages/            # Page components
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── python/               # Python analysis scripts
│   ├── analyze_match.py  # Main analysis script
│   ├── extract_positions.py
│   ├── generate_heatmap.py
│   └── requirements.txt
├── public/               # Static assets
│   ├── uploads/          # Uploaded videos
│   ├── heatmaps/         # Generated heatmaps
│   └── analysis/         # Analysis results
├── server.js             # Backend server
└── package.json
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3003
VITE_API_BASE_URL=http://localhost:3003
```

### Server Configuration

Edit `server.js` to customize:
- Port number
- CORS settings
- Upload limits
- Static file paths

## 🐛 Troubleshooting

### Gamepad Not Detected
- Ensure controller is properly connected
- Try reconnecting the controller
- Check browser gamepad support (Chrome/Edge recommended)
- Press any button to wake up the controller

### Video Not Syncing
- Check network connection
- Ensure all devices are connected to the same server
- Refresh the page on viewer devices
- Check browser console for errors

### Analysis Failing
- Verify Python dependencies are installed
- Check video file format (MP4 recommended)
- Ensure sufficient disk space
- Check Python script logs in terminal

### Audio Not Broadcasting
- Allow microphone permissions in browser
- Check audio input device settings
- Ensure WebRTC is supported (HTTPS or localhost only)
- Try refreshing both broadcaster and viewer

## 📝 API Endpoints

### Video Upload
```
POST /api/upload-video
Content-Type: multipart/form-data
Body: { video: File }
Response: { success: true, videoUrl: string }
```

### Match Analysis
```
POST /api/analyze-match
Content-Type: multipart/form-data
Body: { 
  video: File,
  clips?: string,
  generate_annotated_video?: string
}
Response: { success: true, results: AnalysisResults }
```

### Position Extraction
```
POST /api/extract-positions
Content-Type: multipart/form-data
Body: {
  video: File,
  startTime?: number,
  endTime?: number
}
Response: { success: true, positions: PositionData }
```

### Heatmap Generation
```
POST /api/generate-heatmap
Content-Type: application/json
Body: {
  team?: string,
  scatter?: boolean
}
Response: { success: true, heatmap: string }
```

## 🔌 Socket.IO Events

### Client → Server
- `new-event` - Log new match event
- `update-event` - Update existing event
- `sync-timer` - Sync match timer
- `sync-teams` - Sync team rosters
- `select-team` - Select active team
- `video-play` - Play video
- `video-pause` - Pause video
- `video-seek` - Seek to timestamp
- `video-loaded` - Notify video loaded

### Server → Client
- `sync-state` - Initial state sync
- `role-assignment` - Assign broadcaster/viewer role
- `new-event` - Broadcast new event
- `update-event` - Broadcast event update
- `sync-timer` - Broadcast timer update
- `sync-teams` - Broadcast team data
- `video-play` - Broadcast play command
- `video-pause` - Broadcast pause command
- `video-seek` - Broadcast seek command
- `video-loaded` - Broadcast video URL

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **YOLOv8** by Ultralytics for object detection
- **ByteTrack** for multi-object tracking
- **shadcn/ui** for beautiful UI components
- **Socket.IO** for real-time communication

## 📧 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for soccer analysts and coaches**
#   t a c t a  
 