// src/services/analysis.service.js - Analysis service (local Python or Replicate)
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ReplicateAnalyzer } from '../../replicate-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const replicateAnalyzer = new ReplicateAnalyzer();

export async function analyzeMatch(videoPath, options = {}) {
    // Check for Remote URL (RunPod)
    if (options.remoteUrl) {
        console.log(`🚀 Using Remote Server: ${options.remoteUrl}`);
        return await analyzeWithRemote(videoPath, options);
    }

    // Use Replicate if configured
    if (replicateAnalyzer.isEnabled()) {
        console.log('🚀 Using Replicate GPU for analysis');
        return await analyzeWithReplicate(videoPath, options);
    } else {
        console.log('💻 Using local Python for analysis');
        return await analyzeWithPython(videoPath, options);
    }
}

async function analyzeWithRemote(videoPath, options) {
    try {
        const FormData = (await import('form-data')).default;
        const fetch = (await import('node-fetch')).default;
        const fs = (await import('fs')).default;

        const form = new FormData();
        form.append('video', fs.createReadStream(videoPath));

        if (options.clips) {
            form.append('clips', JSON.stringify(options.clips));
        }

        form.append('generate_video', String(options.generateVideo || false));
        form.append('conf', String(options.conf || 0.3));

        const remoteUrl = options.remoteUrl.replace(/\/$/, ''); // Remove trailing slash
        const response = await fetch(`${remoteUrl}/analyze`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Remote server error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Remote analysis failed:', error);
        return { success: false, error: error.message };
    }
}

async function analyzeWithReplicate(videoPath, options) {
    try {
        const results = await replicateAnalyzer.analyze(videoPath, {
            confidenceThreshold: options.conf || 0.3,
            generateVideo: options.generateVideo || false
        });

        return { success: true, results };
    } catch (error) {
        console.error('Replicate analysis failed:', error);
        return { success: false, error: error.message };
    }
}

function analyzeWithPython(videoPath, options) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(rootDir, 'python', 'analyze_match.py');
        const outputPath = path.join(rootDir, 'public', 'analysis', `analysis-${Date.now()}.json`);

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const args = [pythonScript, '--video', videoPath, '--output', outputPath];

        if (options.clips && options.clips.length > 0) {
            args.push('--clips', JSON.stringify(options.clips));
        }

        if (options.generateVideo) {
            args.push('--generate-video');
        }

        const python = spawn('python', args);
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log('[Python]:', data.toString().trim());
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error('[Python Error]:', data.toString().trim());
        });

        python.on('close', (code) => {
            if (code !== 0) {
                return resolve({ success: false, error: 'Analysis failed', details: stderr });
            }

            try {
                const results = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                resolve({ success: true, results });
            } catch (e) {
                resolve({ success: false, error: 'Failed to parse results', details: e.message });
            }
        });
    });
}

export async function detectPlayers(image, homography, useHighContrast = false) {
    try {
        const fetch = (await import('node-fetch')).default;
        const FormData = (await import('form-data')).default;

        const form = new FormData();
        form.append('image', image);
        if (homography) {
            form.append('homography', homography);
        }
        form.append('high_contrast', useHighContrast ? 'true' : 'false');

        // Try local Python API or remote analysis URL
        const analysisBaseUrl = process.env.VITE_ANALYSIS_API_URL || 'http://localhost:8000';
        const response = await fetch(`${analysisBaseUrl}/api/detect-players`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Python API error (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Player detection failed:', error);
        return { success: false, error: error.message };
    }
}
