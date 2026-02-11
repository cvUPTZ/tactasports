import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, RefreshCw, AlertCircle } from "lucide-react";
import { extractPositions, generateHeatmap, getHeatmapImageUrl, type PositionData } from "@/utils/heatmapApi";

interface PlayerHeatmapProps {
    videoFile: File | null;
    teamNames?: { teamA: string, teamB: string };
}

export const PlayerHeatmap = ({ videoFile, teamNames = { teamA: "Team A", teamB: "Team B" } }: PlayerHeatmapProps) => {
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [positionData, setPositionData] = useState<PositionData | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | 'both'>('both');
    const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [extractionProgress, setExtractionProgress] = useState<string>('');

    // Time range state
    const [startTime, setStartTime] = useState<string>('0');
    const [endTime, setEndTime] = useState<string>('');

    // Scatter plot state
    const [showScatter, setShowScatter] = useState<boolean>(false);

    const handleExtractPositions = async () => {
        if (!videoFile) {
            setError('No video file uploaded');
            return;
        }

        setIsExtracting(true);
        setError(null);
        setExtractionProgress('Analyzing video...');

        try {
            setExtractionProgress('Uploading and detecting players...');

            // Parse time inputs
            const start = parseFloat(startTime) || 0;
            const end = endTime ? parseFloat(endTime) : undefined;

            if (end !== undefined && start >= end) {
                throw new Error('Start time must be less than end time');
            }

            // Pass the file object and time range directly for upload
            const positions = await extractPositions(videoFile, start, end);

            setPositionData(positions);
            setExtractionProgress('');

            // Auto-generate heatmap after extraction
            await handleGenerateHeatmap(selectedTeam);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract positions');
            setExtractionProgress('');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGenerateHeatmap = async (team: 'A' | 'B' | 'both') => {
        setIsGenerating(true);
        setError(null);

        try {
            const teamParam = team === 'both' ? undefined : team;
            const result = await generateHeatmap(teamParam, showScatter);

            if (result.success && result.imageUrl) {
                // Add timestamp to force reload
                setHeatmapUrl(`${result.imageUrl}?t=${Date.now()}`);
            } else {
                setError(result.error || 'Failed to generate heatmap');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate heatmap');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTeamChange = async (team: 'A' | 'B' | 'both') => {
        setSelectedTeam(team);
        if (positionData) {
            await handleGenerateHeatmap(team);
        }
    };

    const handleScatterChange = async (checked: boolean) => {
        setShowScatter(checked);
        if (positionData) {
            // We need to trigger regeneration, but state update might not be immediate
            // So we pass the new value directly
            setIsGenerating(true);
            setError(null);

            try {
                const teamParam = selectedTeam === 'both' ? undefined : selectedTeam;
                const result = await generateHeatmap(teamParam, checked);

                if (result.success && result.imageUrl) {
                    setHeatmapUrl(`${result.imageUrl}?t=${Date.now()}`);
                } else {
                    setError(result.error || 'Failed to generate heatmap');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate heatmap');
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleDownload = () => {
        if (heatmapUrl) {
            const link = document.createElement('a');
            link.href = heatmapUrl;
            link.download = `heatmap_team_${selectedTeam}${showScatter ? '_scatter' : ''}.png`;
            link.click();
        }
    };

    if (!videoFile) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Player Heatmaps</CardTitle>
                    <CardDescription>Upload a video first to generate player activity heatmaps</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Please upload a match video to generate heatmaps showing where players were most active.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Player Heatmaps</CardTitle>
                <CardDescription>
                    AI-powered analysis showing where players were most active during the match
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Generate Button */}
                {!positionData && !heatmapUrl && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-2">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Start Time (s)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">End Time (s)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="End"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 mb-2">
                            <Checkbox
                                id="scatter-mode"
                                checked={showScatter}
                                onCheckedChange={(checked) => setShowScatter(checked as boolean)}
                            />
                            <label
                                htmlFor="scatter-mode"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Show Player Points (Scatter Plot)
                            </label>
                        </div>

                        <p className="text-sm text-muted-foreground text-center">
                            Click below to analyze the video and generate heatmaps
                        </p>
                        <Button
                            onClick={handleExtractPositions}
                            disabled={isExtracting}
                            size="lg"
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing Video...
                                </>
                            ) : (
                                'Generate Heatmaps'
                            )}
                        </Button>
                        {extractionProgress && (
                            <p className="text-xs text-muted-foreground animate-pulse">
                                {extractionProgress}
                            </p>
                        )}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Team Selector */}
                {(positionData || heatmapUrl) && (
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button
                                    variant={selectedTeam === 'A' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTeamChange('A')}
                                    disabled={isGenerating}
                                >
                                    {teamNames.teamA}
                                </Button>
                                <Button
                                    variant={selectedTeam === 'B' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTeamChange('B')}
                                    disabled={isGenerating}
                                >
                                    {teamNames.teamB}
                                </Button>
                                <Button
                                    variant={selectedTeam === 'both' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleTeamChange('both')}
                                    disabled={isGenerating}
                                >
                                    Both Teams
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExtractPositions}
                                    disabled={isExtracting || isGenerating}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate
                                </Button>
                                {heatmapUrl && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownload}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 justify-center">
                            <Checkbox
                                id="scatter-mode-active"
                                checked={showScatter}
                                onCheckedChange={(checked) => handleScatterChange(checked as boolean)}
                                disabled={isGenerating}
                            />
                            <label
                                htmlFor="scatter-mode-active"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Show Player Points (Scatter Plot)
                            </label>
                        </div>
                    </div>
                )}

                {/* Heatmap Display */}
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating {showScatter ? 'scatter plot' : 'heatmap'}...</p>
                    </div>
                )}

                {heatmapUrl && !isGenerating && (
                    <div className="relative rounded-lg overflow-hidden border bg-muted/20">
                        <img
                            src={heatmapUrl}
                            alt={`Heatmap for ${selectedTeam === 'both' ? 'both teams' : `Team ${selectedTeam}`}`}
                            className="w-full h-auto"
                        />
                    </div>
                )}

                {/* Stats Display */}
                {positionData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                                {positionData.positions.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Positions Detected</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                                {Math.round(positionData.video_info.duration)}s
                            </p>
                            <p className="text-xs text-muted-foreground">Video Duration</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                                {positionData.positions.filter(p => p.team === 'A').length}
                            </p>
                            <p className="text-xs text-muted-foreground">{teamNames.teamA} Positions</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                                {positionData.positions.filter(p => p.team === 'B').length}
                            </p>
                            <p className="text-xs text-muted-foreground">{teamNames.teamB} Positions</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
