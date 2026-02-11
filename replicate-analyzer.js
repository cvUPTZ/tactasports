// Replicate GPU Integration Module
import Replicate from 'replicate';
import fs from 'fs';

export class ReplicateAnalyzer {
    constructor() {
        this.apiToken = process.env.REPLICATE_API_TOKEN;
        this.model = process.env.REPLICATE_MODEL;
        this.enabled = !!(this.apiToken && this.model);

        if (this.enabled) {
            this.replicate = new Replicate({ auth: this.apiToken });
            console.log(`✅ Replicate GPU enabled: ${this.model}`);
        } else {
            console.log('ℹ️  Replicate not configured, using local Python');
        }
    }

    isEnabled() {
        return this.enabled;
    }

    async analyze(videoPath, options = {}) {
        if (!this.enabled) {
            throw new Error('Replicate not configured');
        }

        console.log(`🚀 Starting Replicate analysis: ${videoPath}`);

        try {
            // Read video file and convert to base64 data URI
            const videoBuffer = fs.readFileSync(videoPath);
            const base64Video = videoBuffer.toString('base64');
            const dataUri = `data:video/mp4;base64,${base64Video}`;

            // Run prediction
            const output = await this.replicate.run(
                this.model,
                {
                    input: {
                        video: dataUri,
                        confidence_threshold: options.confidenceThreshold || 0.3,
                        generate_video: options.generateVideo || false
                    }
                }
            );

            console.log('✅ Replicate analysis complete');
            return output;

        } catch (error) {
            console.error('❌ Replicate analysis failed:', error);
            throw error;
        }
    }

    async analyzeWithProgress(videoPath, options = {}, progressCallback) {
        if (!this.enabled) {
            throw new Error('Replicate not configured');
        }

        console.log(`🚀 Starting Replicate analysis with progress: ${videoPath}`);

        try {
            const videoBuffer = fs.readFileSync(videoPath);
            const base64Video = videoBuffer.toString('base64');
            const dataUri = `data:video/mp4;base64,${base64Video}`;

            // Create prediction
            const prediction = await this.replicate.predictions.create({
                version: this.model,
                input: {
                    video: dataUri,
                    confidence_threshold: options.confidenceThreshold || 0.3,
                    generate_video: options.generateVideo || false
                }
            });

            // Poll for completion
            let result = prediction;
            while (result.status !== 'succeeded' && result.status !== 'failed') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                result = await this.replicate.predictions.get(prediction.id);

                if (progressCallback) {
                    progressCallback({
                        status: result.status,
                        logs: result.logs
                    });
                }
            }

            if (result.status === 'failed') {
                throw new Error(result.error || 'Prediction failed');
            }

            console.log('✅ Replicate analysis complete');
            return result.output;

        } catch (error) {
            console.error('❌ Replicate analysis failed:', error);
            throw error;
        }
    }
}
