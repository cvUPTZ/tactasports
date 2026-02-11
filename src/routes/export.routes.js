import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure public/extracted exists
const EXTRACTED_DIR = path.join(__dirname, '../../public/extracted');
if (!fs.existsSync(EXTRACTED_DIR)) {
    fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
}

router.post('/extract-clip', async (req, res) => {
    try {
        const { videoPath, startTime, duration, eventType, eventName, outputRelativePath } = req.body;

        if (!videoPath || startTime === undefined) {
            return res.status(400).json({ success: false, error: "Missing videoPath or startTime" });
        }

        let finalOutputPath;
        let publicUrl;

        // NEW: If a full relative path (folder+filename) is provided, use it directly (under EXTRACTED_DIR)
        if (outputRelativePath) {
            // Remove leading slashes to prevent root escape
            const safeRelativePath = outputRelativePath.replace(/^(\.\.(\/|\\|$))+/, '');
            finalOutputPath = path.join(EXTRACTED_DIR, safeRelativePath);
            publicUrl = `/extracted/${safeRelativePath.replace(/\\/g, '/')}`; // Ensure web-safe URL
        } else {
            // LEGACY: Construct from eventType/Name
            const safeEventType = (eventType || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
            const safeEventName = (eventName || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
            const typeDir = path.join(EXTRACTED_DIR, safeEventType);

            if (!fs.existsSync(typeDir)) {
                fs.mkdirSync(typeDir, { recursive: true });
            }

            const timestamp = Date.now();
            const filename = `${timestamp}_${safeEventName}.mp4`;
            finalOutputPath = path.join(typeDir, filename);
            publicUrl = `/extracted/${safeEventType}/${filename}`;
        }

        // Ensure parent directory exists for the final output path
        const parentDir = path.dirname(finalOutputPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        // Calculate start time (ensure non-negative)
        const start = Math.max(0, parseFloat(startTime));
        const dur = parseFloat(duration) || 10;

        // Construct FFmpeg command
        const command = `ffmpeg -ss ${start} -i "${videoPath}" -t ${dur} -c copy "${finalOutputPath}" -y`;

        console.log(`[Export] Executing: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Export] FFmpeg error: ${error.message}`);
                return res.status(500).json({ success: false, error: "FFmpeg execution failed" });
            }

            console.log(`[Export] Success: ${finalOutputPath}`);
            res.json({
                success: true,
                message: "Clip extracted successfully",
                path: finalOutputPath,
                url: publicUrl
            });
        });

    } catch (error) {
        console.error("[Export] Error:", error);
        res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

// NEW: List all extracted videos
router.get('/videos', async (req, res) => {
    try {
        if (!fs.existsSync(EXTRACTED_DIR)) {
            return res.json([]);
        }

        const getFilesRecursively = (dir) => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach((file) => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFilesRecursively(filePath));
                } else if (file.endsWith('.mp4')) {
                    // Create web-accessible URL
                    // filePath is absolute, need relative to EXTRACTED_DIR
                    const relativePath = path.relative(EXTRACTED_DIR, filePath);
                    // Standardize slashes for URL
                    const urlPath = relativePath.replace(/\\/g, '/');

                    results.push({
                        filename: file,
                        path: relativePath, // logical path relative to /public/extracted
                        url: `/extracted/${urlPath}`,
                        date: stat.mtime,
                        size: stat.size
                    });
                }
            });
            return results;
        };

        const videos = getFilesRecursively(EXTRACTED_DIR);
        // Sort by newest first
        videos.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(videos);
    } catch (error) {
        console.error("[Export] Error listing videos:", error);
        res.status(500).json({ success: false, error: "Failed to list videos" });
    }
});

export default router;
