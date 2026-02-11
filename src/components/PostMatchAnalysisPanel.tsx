import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE_URL, ANALYSIS_API_URL } from '@/utils/apiConfig';

interface PostMatchAnalysisPanelProps {
    onAnalysisComplete?: (results: any) => void;
}

type AnalysisStatus = 'idle' | 'uploading' | 'calibrating' | 'processing' | 'completed' | 'error';

export const PostMatchAnalysisPanel: React.FC<PostMatchAnalysisPanelProps> = ({
    onAnalysisComplete
}) => {
    const [status, setStatus] = useState<AnalysisStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [calibrationPoints, setCalibrationPoints] = useState<Array<[number, number]>>([]);
    const [jobId, setJobId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
            setStatus('calibrating');
        }
    };

    const handleStartAnalysis = async () => {
        if (!videoFile) return;

        setStatus('uploading');
        setProgress(0);
        setErrorMessage('');

        try {
            // Upload video and start analysis
            const formData = new FormData();
            formData.append('video', videoFile);
            formData.append('calibration', JSON.stringify(calibrationPoints));
            formData.append('models', JSON.stringify(['yolov10', 'rtdetr', 'deepsort']));

            const response = await fetch(`${ANALYSIS_API_URL}/analyze-video`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to start analysis');
            }

            const data = await response.json();
            setJobId(data.job_id);
            setStatus('processing');

            // Poll for status
            pollAnalysisStatus(data.job_id);

        } catch (error) {
            console.error('Analysis error:', error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const pollAnalysisStatus = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${ANALYSIS_API_URL}/analysis-status/${jobId}`);
                const data = await response.json();

                setProgress(data.progress || 0);

                if (data.status === 'completed') {
                    clearInterval(interval);
                    setStatus('completed');
                    if (onAnalysisComplete && data.results) {
                        onAnalysisComplete(data.results);
                    }
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    setStatus('error');
                    setErrorMessage(data.error || 'Analysis failed');
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 1000); // Poll every second
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        Analyse POST-MATCH
                    </h3>
                    <Badge variant={
                        status === 'completed' ? 'default' :
                            status === 'processing' ? 'secondary' :
                                status === 'error' ? 'destructive' : 'outline'
                    }>
                        {status === 'idle' && 'Prêt'}
                        {status === 'uploading' && 'Upload...'}
                        {status === 'calibrating' && 'Calibration'}
                        {status === 'processing' && 'Analyse en cours'}
                        {status === 'completed' && 'Terminé'}
                        {status === 'error' && 'Erreur'}
                    </Badge>
                </div>
            </div>

            {/* Step 1: Upload Video */}
            <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${videoFile ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                        {videoFile ? '✓' : '1'}
                    </div>
                    <h4 className="font-semibold">Upload Vidéo</h4>
                </div>

                {!videoFile ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">Cliquez pour uploader une vidéo</p>
                        <p className="text-xs text-muted-foreground">MP4, AVI, MOV (max 2GB)</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium">{videoFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setVideoFile(null);
                                setStatus('idle');
                            }}
                        >
                            Changer
                        </Button>
                    </div>
                )}
            </div>

            {/* Step 2: Calibration (simplified for now) */}
            {videoFile && status === 'calibrating' && (
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            2
                        </div>
                        <h4 className="font-semibold">Calibration Terrain</h4>
                    </div>

                    <div className="bg-muted rounded-lg p-4 mb-3">
                        <p className="text-sm text-muted-foreground mb-2">
                            Cliquez sur les 4 coins du terrain dans la vidéo pour calibrer les positions.
                        </p>
                        <div className="aspect-video bg-background rounded border border-border flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Aperçu vidéo (à implémenter)</p>
                        </div>
                    </div>

                    <Button
                        onClick={() => setStatus('idle')}
                        className="w-full"
                    >
                        Confirmer Calibration
                    </Button>
                </div>
            )}

            {/* Step 3: Start Analysis */}
            {videoFile && status !== 'calibrating' && status !== 'processing' && status !== 'completed' && (
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                            3
                        </div>
                        <h4 className="font-semibold">Lancer l'Analyse</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm">Modèles de détection</span>
                            <Badge variant="secondary">YOLOv10 + RT-DETR</Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm">Tracking</span>
                            <Badge variant="secondary">DeepSORT + ReID</Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span className="text-sm">Métriques</span>
                            <Badge variant="secondary">xG, xThreat, VAEP</Badge>
                        </div>

                        <Button
                            onClick={handleStartAnalysis}
                            className="w-full"
                            size="lg"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Démarrer l'Analyse
                        </Button>
                    </div>
                </div>
            )}

            {/* Processing Status */}
            {status === 'processing' && (
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <div className="animate-spin">⚙️</div>
                        </div>
                        <h4 className="font-semibold">Analyse en cours...</h4>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Progression</span>
                                <span className="font-mono">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-muted rounded">
                                <div className="text-muted-foreground">Frame</div>
                                <div className="font-mono">{Math.floor(progress * 30)}/3000</div>
                            </div>
                            <div className="p-2 bg-muted rounded">
                                <div className="text-muted-foreground">Temps restant</div>
                                <div className="font-mono">~{Math.floor((100 - progress) / 10)} min</div>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span>Détection joueurs (YOLOv10)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <span>Tracking identités (DeepSORT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                <span>Calcul métriques (en attente)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completed Status */}
            {status === 'completed' && (
                <div className="bg-card border border-green-500 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <h4 className="font-semibold text-green-500">Analyse Terminée !</h4>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-3 bg-muted rounded text-center">
                            <div className="text-2xl font-bold">3000</div>
                            <div className="text-xs text-muted-foreground">Frames</div>
                        </div>
                        <div className="p-3 bg-muted rounded text-center">
                            <div className="text-2xl font-bold">22</div>
                            <div className="text-xs text-muted-foreground">Joueurs</div>
                        </div>
                        <div className="p-3 bg-muted rounded text-center">
                            <div className="text-2xl font-bold">847</div>
                            <div className="text-xs text-muted-foreground">Événements</div>
                        </div>
                    </div>

                    <Button className="w-full" variant="default">
                        Voir les Résultats
                    </Button>
                </div>
            )}
        </div>
    );
};
