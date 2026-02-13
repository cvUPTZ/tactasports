import React, { useState } from 'react';
import { useScribe } from '@/contexts/ScribeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Trash2, Download, ChevronRight, FileText, Camera } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export const VisualDocumentationView: React.FC = () => {
    const { isRecording, startRecording, stopRecording, steps, clearSteps } = useScribe();
    const [selectedStep, setSelectedStep] = useState<number | null>(null);

    const handleDownload = () => {
        // Basic image download for now
        if (steps.length === 0) return;
        const link = document.createElement('a');
        link.download = `scribe-doc-${Date.now()}.json`;
        const blob = new Blob([JSON.stringify(steps, null, 2)], { type: 'application/json' });
        link.href = URL.createObjectURL(blob);
        link.click();
    };

    return (
        <div className="flex-1 p-6 h-full flex flex-col gap-6 bg-slate-950/50">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        Auto-Scribe Documentation
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Automatically generate step-by-step visual guides from your actions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isRecording ? (
                        <Button variant="destructive" onClick={stopRecording} className="gap-2 animate-pulse">
                            <Square className="w-4 h-4" /> Stop Recording
                        </Button>
                    ) : (
                        <Button variant="default" onClick={startRecording} className="gap-2 bg-green-600 hover:bg-green-700">
                            <Play className="w-4 h-4" /> Start Auto-Scribe
                        </Button>
                    )}
                    <Button variant="outline" onClick={clearSteps} disabled={steps.length === 0} className="gap-2">
                        <Trash2 className="w-4 h-4" /> Clear
                    </Button>
                    <Button variant="secondary" onClick={handleDownload} disabled={steps.length === 0} className="gap-2">
                        <Download className="w-4 h-4" /> Export JSON
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
                {/* Left: Step List */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Captured Steps ({steps.length})</h3>
                    <ScrollArea className="flex-1 rounded-lg border border-white/5 bg-white/5">
                        <div className="p-4 space-y-3">
                            {steps.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-lg">
                                    <Camera className="w-12 h-12 mb-2 opacity-20" />
                                    <p className="text-xs">No steps captured yet.</p>
                                    <p className="text-[10px] opacity-60">Record actions to see them here.</p>
                                </div>
                            ) : (
                                steps.map((step, index) => (
                                    <Card
                                        key={step.id}
                                        className={`cursor-pointer transition-all border-white/10 hover:border-primary/50 group ${selectedStep === index ? 'ring-2 ring-primary bg-primary/5 border-primary/50' : 'bg-slate-900/50'}`}
                                        onClick={() => setSelectedStep(index)}
                                    >
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 border-primary/30 text-primary">
                                                    {index + 1}
                                                </Badge>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-200 line-clamp-1">{step.action}: {step.targetLabel}</p>
                                                    <p className="text-[10px] text-slate-500 leading-none">
                                                        {new Date(step.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-600 group-hover:text-primary" />
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right: Step Preview / Editor */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                    {selectedStep !== null ? (
                        <>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Step Preview</h3>
                            <Card className="flex-1 bg-slate-900 border-white/10 overflow-hidden relative group">
                                <CardHeader className="p-4 border-b border-white/5 bg-slate-950/50">
                                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                                        <span>Step {selectedStep + 1}: {steps[selectedStep].action} on "{steps[selectedStep].targetLabel}"</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 h-full flex items-center justify-center bg-black/40">
                                    <img
                                        src={steps[selectedStep].imageUrl}
                                        alt={`Step ${selectedStep + 1}`}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    {/* Future: Fabric.js Annotation Layer here */}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-lg bg-slate-900/20">
                            <p className="text-xs">Select a step to preview the captured visual.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
