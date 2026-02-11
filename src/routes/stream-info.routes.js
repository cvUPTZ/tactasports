// src/routes/stream-info.routes.js
// Diagnostic route to check stream codec and format
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const router = express.Router();

/**
 * Endpoint to get stream codec information using ffprobe
 * GET /api/stream-info?url=<stream_url>
 */
router.get('/stream-info', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const streamUrl = decodeURIComponent(url);
        console.log('[Stream Info] Checking:', streamUrl);

        // Use ffprobe to get stream information
        const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${streamUrl}"`;

        try {
            const { stdout, stderr } = await execPromise(command, { timeout: 10000 });

            if (stderr) {
                console.error('[Stream Info] ffprobe stderr:', stderr);
            }

            const info = JSON.parse(stdout);

            // Extract useful information
            const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
            const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');

            const result = {
                video: videoStream ? {
                    codec: videoStream.codec_name,
                    profile: videoStream.profile,
                    width: videoStream.width,
                    height: videoStream.height,
                    fps: videoStream.r_frame_rate,
                    bitrate: videoStream.bit_rate,
                    pixelFormat: videoStream.pix_fmt,
                    supported: checkBrowserSupport(videoStream.codec_name)
                } : null,
                audio: audioStream ? {
                    codec: audioStream.codec_name,
                    sampleRate: audioStream.sample_rate,
                    channels: audioStream.channels,
                    bitrate: audioStream.bit_rate
                } : null,
                format: info.format ? {
                    name: info.format.format_name,
                    duration: info.format.duration,
                    size: info.format.size,
                    bitrate: info.format.bit_rate
                } : null
            };

            console.log('[Stream Info] Result:', JSON.stringify(result, null, 2));
            res.json(result);

        } catch (execError: any) {
            console.error('[Stream Info] ffprobe error:', execError.message);
            return res.status(500).json({
                error: 'Failed to analyze stream',
                message: 'ffprobe not available or stream inaccessible',
                details: execError.message
            });
        }

    } catch (error: any) {
        console.error('[Stream Info] Error:', error);
        res.status(500).json({
            error: 'Internal error',
            message: error.message
        });
    }
});

/**
 * Check if a codec is supported in browsers
 */
function checkBrowserSupport(codec: string): {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    edge: boolean;
    notes: string;
} {
    const lowerCodec = codec?.toLowerCase() || '';

    // H.264 / AVC
    if (lowerCodec.includes('h264') || lowerCodec.includes('avc')) {
        return {
            chrome: true,
            firefox: true,
            safari: true,
            edge: true,
            notes: 'Fully supported in all browsers'
        };
    }

    // H.265 / HEVC
    if (lowerCodec.includes('h265') || lowerCodec.includes('hevc')) {
        return {
            chrome: false,
            firefox: false,
            safari: true, // macOS/iOS only with hardware support
            edge: false, // Requires HEVC extension on Windows
            notes: 'Limited support. Only Safari on Apple devices. Not recommended for web.'
        };
    }

    // VP8
    if (lowerCodec.includes('vp8')) {
        return {
            chrome: true,
            firefox: true,
            safari: true,
            edge: true,
            notes: 'WebM codec, good browser support'
        };
    }

    // VP9
    if (lowerCodec.includes('vp9')) {
        return {
            chrome: true,
            firefox: true,
            safari: false, // Limited
            edge: true,
            notes: 'Modern WebM codec, good Chrome/Firefox support'
        };
    }

    // AV1
    if (lowerCodec.includes('av1')) {
        return {
            chrome: true,
            firefox: true,
            safari: false,
            edge: true,
            notes: 'Next-gen codec, growing support'
        };
    }

    return {
        chrome: false,
        firefox: false,
        safari: false,
        edge: false,
        notes: 'Unknown codec, likely unsupported'
    };
}

export default router;