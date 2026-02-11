// src/routes/upload.routes.js - Video upload routes
import express from 'express';
import { upload } from '../config/multer.js';

const router = express.Router();

router.post('/upload-video', (req, res, next) => {
    upload.single('video')(req, res, (err) => {
        if (err) {
            console.error("Upload Error:", err);
            return res.status(500).json({ success: false, error: err.message || "File upload failed" });
        }
        next();
    });
}, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const videoUrl = `/uploads/${req.file.filename}`;
    // Construct absolute path for FFmpeg usage later
    const filePath = req.file.path;
    console.log(`Video uploaded: ${videoUrl}`);

    res.json({ success: true, videoUrl, filePath });
});

router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log(`Image uploaded: ${imageUrl}`);

    res.json({ success: true, imageUrl });
});

export default router;
