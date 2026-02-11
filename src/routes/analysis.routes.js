// src/routes/analysis.routes.js - Analysis API routes
import express from 'express';
import { upload } from '../config/multer.js';
import { analyzeMatch } from '../services/analysis.service.js';

const router = express.Router();

router.post('/analyze-match', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }

    const videoPath = req.file.path;
    const clips = req.body.clips ? JSON.parse(req.body.clips) : null;
    const generateVideo = req.body.generate_annotated_video === 'true';

    console.log(`📹 Analyzing: ${videoPath}, Clips: ${clips ? clips.length : 'full'}, Video: ${generateVideo}`);

    const result = await analyzeMatch(videoPath, {
        clips,
        generateVideo,
        conf: 0.3,
        remoteUrl: req.headers['x-remote-url'] || req.headers['x-runpod-url'] || req.headers['x-vast-ai-url']
    });

    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

router.post('/detect-players', upload.none(), async (req, res) => {
    const { image, homography } = req.body;

    if (!image) {
        return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const { detectPlayers } = await import('../services/analysis.service.js');
    const result = await detectPlayers(image, homography, req.body.high_contrast === 'true');

    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

export default router;
