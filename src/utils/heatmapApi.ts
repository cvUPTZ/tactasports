/**
 * API client for heatmap operations
 */

import { API_BASE_URL } from "./apiConfig";

export interface PositionData {
    video_info: {
        total_frames: number;
        fps: number;
        width: number;
        height: number;
        duration: number;
    };
    positions: Array<{
        frame: number;
        timestamp: number;
        x: number;
        y: number;
        team: 'A' | 'B';
        confidence: number;
    }>;
}

export interface HeatmapResponse {
    success: boolean;
    imageUrl?: string;
    filename?: string;
    error?: string;
    details?: string;
}

/**
 * Extract player positions from video file
 */
export async function extractPositions(
    videoFile: File,
    startTime?: number,
    endTime?: number
): Promise<PositionData> {
    const formData = new FormData();
    formData.append('video', videoFile);

    if (startTime !== undefined) {
        formData.append('startTime', startTime.toString());
    }

    if (endTime !== undefined) {
        formData.append('endTime', endTime.toString());
    }

    const response = await fetch(`${API_BASE_URL}/api/extract-positions`, {
        method: 'POST',
        body: formData, // Content-Type is set automatically
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to extract positions');
    }

    const data = await response.json();
    return data.positions;
}

/**
 * Generate heatmap from position data
 */
export async function generateHeatmap(
    team?: 'A' | 'B',
    scatter: boolean = false
): Promise<HeatmapResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate-heatmap`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team, scatter }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate heatmap');
    }

    return await response.json();
}

/**
 * Get full URL for heatmap image
 */
export function getHeatmapImageUrl(filename: string): string {
    return `${API_BASE_URL}/heatmaps/${filename}`;
}
