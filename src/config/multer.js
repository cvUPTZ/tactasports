// src/config/multer.js - File upload configuration
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(rootDir, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use 'file-' prefix by default, or 'video-' if it's a video, or 'image-' if it's an image
        let prefix = 'file-';
        if (file.mimetype.startsWith('video/')) prefix = 'video-';
        if (file.mimetype.startsWith('image/')) prefix = 'image-';

        cb(null, prefix + Date.now() + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });
