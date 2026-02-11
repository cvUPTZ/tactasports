// src/routes/roboflow.routes.js - Roboflow Pitch Keypoints Detection API
import express from 'express';

const router = express.Router();

// Roboflow model configuration
const ROBOFLOW_MODEL = 'pitch-keypoints-detection';
const ROBOFLOW_WORKSPACE = 'hacenbarb';
const ROBOFLOW_VERSION = '2';
const ROBOFLOW_API_URL = `https://detect.roboflow.com/${ROBOFLOW_MODEL}/${ROBOFLOW_VERSION}`;

/**
 * POST /api/detect-keypoints
 * Proxy endpoint for Roboflow pitch keypoint detection
 * 
 * Request body:
 * {
 *   image: string (base64 encoded image)
 * }
 * 
 * Response:
 * {
 *   predictions: [{ class, confidence, x, y, width, height }],
 *   image: { width, height }
 * }
 */
router.post('/detect-keypoints', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required'
            });
        }

        const apiKey = process.env.ROBOFLOW_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: 'ROBOFLOW_API_KEY not configured. Please add it to your .env file.'
            });
        }

        // Call Roboflow API
        const roboflowResponse = await fetch(`${ROBOFLOW_API_URL}?api_key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: image, // Send base64 directly
        });

        if (!roboflowResponse.ok) {
            const errorText = await roboflowResponse.text();
            console.error('Roboflow API error:', errorText);
            return res.status(roboflowResponse.status).json({
                success: false,
                error: `Roboflow API error: ${roboflowResponse.status}`,
                details: errorText
            });
        }

        const data = await roboflowResponse.json();

        // Transform response to match our expected format
        const result = {
            success: true,
            predictions: data.predictions || [],
            image: {
                width: data.image?.width || 0,
                height: data.image?.height || 0
            }
        };

        console.log(`✅ Detected ${result.predictions.length} keypoints`);
        res.json(result);

    } catch (error) {
        console.error('Keypoint detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to detect keypoints',
            details: error.message
        });
    }
});

/**
 * GET /api/roboflow-status
 * Check if Roboflow API is configured
 */
router.get('/roboflow-status', (req, res) => {
    const isConfigured = !!process.env.ROBOFLOW_API_KEY;
    res.json({
        success: true,
        configured: isConfigured,
        model: `${ROBOFLOW_WORKSPACE}/${ROBOFLOW_MODEL}`,
        version: ROBOFLOW_VERSION
    });
});

export default router;
