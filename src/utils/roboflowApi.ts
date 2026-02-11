/**
 * Roboflow Pitch Keypoints Detection API
 * Uses the hacenbarb/pitch-keypoints-detection model to detect football pitch landmarks
 */

import { API_BASE_URL } from './apiConfig';

export interface Point {
    x: number;
    y: number;
}

export interface DetectedKeypoint {
    class: string;
    confidence: number;
    x: number;  // center x in pixels
    y: number;  // center y in pixels
    width: number;
    height: number;
}

export interface KeypointDetectionResult {
    predictions: DetectedKeypoint[];
    image: {
        width: number;
        height: number;
    };
}

export interface DetectedPlayer {
    id: number;
    bbox: [number, number, number, number];
    center: [number, number];
    pitch_coords: [number, number] | null;
    team: string;
    confidence: number;
    cls: number;
}

export interface PlayerDetectionResult {
    success: boolean;
    players: DetectedPlayer[];
    error?: string;
}

export interface CalibrationPair {
    src: Point;  // Video/image pixel coordinates
    dst: Point;  // Pitch coordinates in meters (105x68m)
    class: string;
    confidence: number;
    isAutoDetected: boolean;
}

/**
 * Mapping of Roboflow class codes to FIFA pitch coordinates (105x68m pitch)
 * Expanded to 29 points based on the Soccana/SoccerNet standard
 */
export const KEYPOINT_PITCH_MAPPING: Record<string, { x: number; y: number; name: string }> = {
    // Corners (4)
    'TLC': { x: 0, y: 0, name: 'Top-Left Corner' },
    'TRC': { x: 105, y: 0, name: 'Top-Right Corner' },
    'BLC': { x: 0, y: 68, name: 'Bottom-Left Corner' },
    'BRC': { x: 105, y: 68, name: 'Bottom-Right Corner' },

    // Halfway Line (2)
    'TMC': { x: 52.5, y: 0, name: 'Halfway Line Top' },
    'BMC': { x: 52.5, y: 68, name: 'Halfway Line Bottom' },

    // Center Circle (5 points)
    'CC': { x: 52.5, y: 34, name: 'Center Circle Center' },
    'CCL': { x: 43.35, y: 34, name: 'Center Circle Left' },
    'CCR': { x: 61.65, y: 34, name: 'Center Circle Right' },
    'CCT': { x: 52.5, y: 24.85, name: 'Center Circle Top' },
    'CCB': { x: 52.5, y: 43.15, name: 'Center Circle Bottom' },

    // Left Penalty Area (4 corners + penalty spot)
    'LPA_TL': { x: 0, y: 13.84, name: 'Left Penalty Top-Left' },
    'LPA_BL': { x: 0, y: 54.16, name: 'Left Penalty Bottom-Left' },
    'LPA_TR': { x: 16.5, y: 13.84, name: 'Left Penalty Top-Right' },
    'LPA_BR': { x: 16.5, y: 54.16, name: 'Left Penalty Bottom-Right' },
    'LPS': { x: 11, y: 34, name: 'Left Penalty Spot' },

    // Right Penalty Area (4 corners + penalty spot)
    'RPA_TL': { x: 88.5, y: 13.84, name: 'Right Penalty Top-Left' },
    'RPA_BL': { x: 88.5, y: 54.16, name: 'Right Penalty Bottom-Left' },
    'RPA_TR': { x: 105, y: 13.84, name: 'Right Penalty Top-Right' },
    'RPA_BR': { x: 105, y: 54.16, name: 'Right Penalty Bottom-Right' },
    'RPS': { x: 94, y: 34, name: 'Right Penalty Spot' },

    // Left Goal Area (4 points)
    'LGA_TL': { x: 0, y: 24.84, name: 'Left Goal Area Top-Left' },
    'LGA_BL': { x: 0, y: 43.16, name: 'Left Goal Area Bottom-Left' },
    'LGA_TR': { x: 5.5, y: 24.84, name: 'Left Goal Area Top-Right' },
    'LGA_BR': { x: 5.5, y: 43.16, name: 'Left Goal Area Bottom-Right' },

    // Right Goal Area (4 points)
    'RGA_TL': { x: 99.5, y: 24.84, name: 'Right Goal Area Top-Left' },
    'RGA_BL': { x: 99.5, y: 43.16, name: 'Right Goal Area Bottom-Left' },
    'RGA_TR': { x: 105, y: 24.84, name: 'Right Goal Area Top-Right' },
    'RGA_BR': { x: 105, y: 43.16, name: 'Right Goal Area Bottom-Right' }
};

/**
 * Convert image/video file to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Convert a video frame at a specific time to base64
 */
export async function videoFrameToBase64(videoUrl: string, time: number = 0): Promise<string> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;

        video.onloadedmetadata = () => {
            video.currentTime = time;
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const base64 = dataUrl.split(',')[1];
            resolve(base64);
        };

        video.onerror = () => reject(new Error('Failed to load video'));
    });
}

/**
 * Detect pitch keypoints using Roboflow API (proxied through backend)
 */
export async function detectPitchKeypoints(imageBase64: string): Promise<KeypointDetectionResult> {
    const response = await fetch(`${API_BASE_URL}/api/detect-keypoints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageBase64,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Detect players in a single frame using the local backend
 */
export async function detectPlayers(imageBase64: string, homography?: string, highContrast: boolean = false): Promise<PlayerDetectionResult> {
    const formData = new FormData();
    formData.append('image', imageBase64);
    if (homography) {
        formData.append('homography', homography);
    }
    formData.append('high_contrast', highContrast ? 'true' : 'false');

    const response = await fetch(`${API_BASE_URL}/api/detect-players`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Convert detected keypoints to calibration pairs
 * Maps pixel coordinates to FIFA pitch coordinates (105x68m)
 */
export function keypointsToCalibrationPairs(
    detections: DetectedKeypoint[],
    minConfidence: number = 0.5
): CalibrationPair[] {
    const pairs: CalibrationPair[] = [];

    for (const detection of detections) {
        if (detection.confidence < minConfidence) continue;

        const pitchMapping = KEYPOINT_PITCH_MAPPING[detection.class];
        if (!pitchMapping) {
            console.warn(`Unknown keypoint class: ${detection.class}`);
            continue;
        }

        pairs.push({
            src: { x: detection.x, y: detection.y },
            dst: { x: pitchMapping.x, y: pitchMapping.y },
            class: detection.class,
            confidence: detection.confidence,
            isAutoDetected: true,
        });
    }

    // Sort by confidence (highest first)
    pairs.sort((a, b) => b.confidence - a.confidence);

    return pairs;
}

/**
 * Get class name for a keypoint
 */
export function getKeypointName(classCode: string): string {
    return KEYPOINT_PITCH_MAPPING[classCode]?.name || classCode;
}
