// server.js - Main application entry point
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import http from 'http';
import https from 'https';
import multer from 'multer';
import dotenv from 'dotenv';
import { ReplicateAnalyzer } from './replicate-analyzer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Replicate (optional GPU acceleration)
const replicateAnalyzer = new ReplicateAnalyzer();

// Routes
import uploadRoutes from './src/routes/upload.routes.js';
import heatmapRoutes from './src/routes/heatmap.routes.js';
import analysisRoutes from './src/routes/analysis.routes.js';
import proxyRoutes from './src/routes/proxy.routes.js';
import roboflowRoutes from './src/routes/roboflow.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import lfpRoutes from './src/routes/lfp.routes.js';
import exportRoutes from './src/routes/export.routes.js';

// Socket
import { setupSocketHandlers } from './src/socket/handlers.js';
import { verifyToken } from './src/services/auth.service.js';

// ===== EXPRESS APP =====
const app = express();

// ===== CORS CONFIG =====
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:8080',
            process.env.CORS_ORIGIN, // Vercel Domain
            process.env.FRONTEND_URL  // Alternative name
        ].filter(Boolean);

        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Allow exact matches or development
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }

        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning', 'Bypass-Tunnel-Reminder', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Simple request logger
app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
        console.log(`[HTTP] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    }
    next();
});
app.use(bodyParser.json({ limit: '50mb' }));

// Static folders
app.use('/heatmaps', express.static(path.join(__dirname, 'public/heatmaps')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/analysis', express.static(path.join(__dirname, 'public/analysis')));
app.use('/extracted', express.static(path.join(__dirname, 'public/extracted')));

// ✅ Frontend Static Files (Built by Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// API
app.use('/api/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', heatmapRoutes);
app.use('/api', analysisRoutes);
app.use('/api', proxyRoutes);
app.use('/api', roboflowRoutes);
app.use('/api/users', userRoutes);
app.use('/api', lfpRoutes);
app.use('/api', exportRoutes);

// ✅ Wildcard Route for SPA (Serve index.html for any non-API routes)
app.get('*', (req, res) => {
    // Skip if it looks like an API or file request
    if (req.path.startsWith('/api') || req.path.includes('.')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ===== HTTP + SOCKET.IO =====
const httpServer = createServer(app);

const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
        origin: true, // Socket.IO doesn't support callback-style, use 'true' to allow all or specify domains
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// 🔐 Socket Auth Middleware
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('No auth token'));
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        socket.user = decoded;
        next();
    } catch (err) {
        next(new Error('Socket authentication failed'));
    }
});

// 🧠 Handlers
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} | user=${socket.user?.id}`);

    // Only the Admin is the authoritative broadcaster for general state sync
    const role = (socket.user?.role === 'admin') ? 'broadcaster' : 'viewer';
    socket.emit('role-assignment', role);

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Modular handlers
setupSocketHandlers(io);

// ===== START SERVER =====
// Add this BEFORE httpServer.listen(PORT, ...)

// ===== OBS TEST ENDPOINT =====
app.get('/api/test-obs', async (req, res) => {
    try {
        console.log('🧪 Testing OBS connection...');
        const OBSWebSocket = (await import('obs-websocket-js')).default;
        const obs = new OBSWebSocket();

        await obs.connect('ws://localhost:4455', '', {
            rpcVersion: 1
        });

        const version = await obs.call('GetVersion');
        await obs.disconnect();

        res.json({
            success: true,
            message: 'OBS connection successful!',
            version
        });
    } catch (error) {
        console.error('🧪 OBS test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

// ===== START SERVER =====
// --- Event Config API ---
const EVENTS_CONFIG_FILE = path.join(__dirname, 'config', 'events.json');

app.get('/api/events-config', async (req, res) => {
    try {
        // Using fs.promises for async file operations
        const fileExists = await fs.promises.access(EVENTS_CONFIG_FILE, fs.constants.F_OK)
            .then(() => true)
            .catch(() => false);

        if (fileExists) {
            const data = await fs.promises.readFile(EVENTS_CONFIG_FILE, 'utf8');
            const events = JSON.parse(data);
            res.json(events);
        } else {
            // If no config, return the default registry (client will need to handle this fallback initially or we prime it)
            res.json([]);
        }
    } catch (err) {
        console.error('Error reading events config:', err);
        res.status(500).json({ error: 'Failed to read events config' });
    }
});

app.post('/api/events-config', async (req, res) => {
    try {
        const events = req.body;
        // Ensure directory exists
        await fs.promises.mkdir(path.dirname(EVENTS_CONFIG_FILE), { recursive: true });
        await fs.promises.writeFile(EVENTS_CONFIG_FILE, JSON.stringify(events, null, 2), 'utf8');
        console.log('✅ Events configuration updated');
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving events config:', err);
        res.status(500).json({ error: 'Failed to save events config' });
    }
});

// Global Error Handler (Must be last middleware)
app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    // Ensure we don't return HTML for API requests
    if (res.headersSent) {
        return next(err);
    }

    // Multer errors
    if (err.name === 'MulterError') {
        return res.status(400).json({ success: false, error: `Upload Error: ${err.message}` });
    }

    res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3001;
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Allowed CORS Origin: ${process.env.CORS_ORIGIN || 'None (Dev Mode)'}`);
// ... rest of your code
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});
