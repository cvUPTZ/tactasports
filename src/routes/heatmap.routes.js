// src/routes/heatmap.routes.js - Heatmap API routes
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { upload } from '../config/multer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const router = express.Router();

router.post('/extract-positions', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const videoPath = req.file.path;
    const startTime = req.body.startTime || 0;
    const endTime = req.body.endTime || null;
    const outputPath = path.join(rootDir, 'public', 'heatmaps', 'positions.json');
    const pythonScript = path.join(rootDir, 'python', 'extract_positions.py');

    const args = [pythonScript, '--video', videoPath, '--output', outputPath, '--frame-skip', '5', '--start-time', startTime.toString()];
    if (endTime) args.push('--end-time', endTime.toString());

    console.log(`Extracting positions: ${videoPath}`);
    const python = spawn('python', args);
    let stderr = '';

    python.stderr.on('data', (data) => stderr += data.toString());
    python.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: 'Position extraction failed', details: stderr });
        fs.readFile(outputPath, 'utf8', (err, data) => {
            if (err) return res.status(500).json({ error: 'Failed to read positions file' });
            try { res.json({ success: true, positions: JSON.parse(data) }); }
            catch (e) { res.status(500).json({ error: 'Failed to parse positions data' }); }
        });
    });
});

router.post('/generate-heatmap', (req, res) => {
    const { team } = req.body;
    const scatter = req.body.scatter === true;
    const positionsPath = path.join(rootDir, 'public', 'heatmaps', 'positions.json');
    const outputFilename = team ? `heatmap_team_${team}.png` : 'heatmap_both.png';
    const outputPath = path.join(rootDir, 'public', 'heatmaps', outputFilename);
    const pythonScript = path.join(rootDir, 'python', 'generate_heatmap.py');

    if (!fs.existsSync(positionsPath)) return res.status(400).json({ error: 'No position data found.' });

    const args = [pythonScript, '--positions', positionsPath, '--output', outputPath];
    if (team) args.push('--team', team);
    if (scatter) args.push('--scatter');

    const python = spawn('python', args);
    let stderr = '';

    python.stderr.on('data', (data) => stderr += data.toString());
    python.on('close', (code) => {
        if (code !== 0) return res.status(500).json({ error: 'Heatmap generation failed', details: stderr });
        res.json({ success: true, heatmap: `/heatmaps/${outputFilename}` });
    });
});

export default router;
