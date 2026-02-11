import React, { useState } from 'react';
import { useEventConfig } from '@/contexts/EventConfigContext';
import { EventDefinition, GamepadMapping, GamepadModifier } from '@/config/eventRegistry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VisualGamepadConfig from './VisualGamepadConfig';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit2, RotateCcw, Save, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const EventConfigTable = () => {
    const { events, updateEvent, resetToDefaults, isLoading } = useEventConfig();
    const [editingEvent, setEditingEvent] = useState<EventDefinition | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Group events/Category Filter could be added here

    // Edit Form State
    const [formData, setFormData] = useState<Partial<EventDefinition>>({});

    const handleEditClick = (event: EventDefinition) => {
        setEditingEvent(event);
        setFormData({ ...event });
        setIsDialogOpen(true);
    };

    const handleAddMapping = () => {
        const currentMappings = formData.gamepadMappings || [];
        setFormData({
            ...formData,
            gamepadMappings: [
                ...currentMappings,
                { buttonIndex: 0, mode: 'LIVE', isHold: false }
            ]
        });
    };

    const handleRemoveMapping = (index: number) => {
        const currentMappings = [...(formData.gamepadMappings || [])];
        currentMappings.splice(index, 1);
        setFormData({ ...formData, gamepadMappings: currentMappings });
    };

    const handleUpdateMapping = (index: number, field: keyof GamepadMapping, value: any) => {
        const currentMappings = [...(formData.gamepadMappings || [])];
        currentMappings[index] = { ...currentMappings[index], [field]: value };
        setFormData({ ...formData, gamepadMappings: currentMappings });
    };

    const handleSave = async () => {
        if (editingEvent && formData) {
            await updateEvent({ ...editingEvent, ...formData } as EventDefinition);
            setIsDialogOpen(false);
        }
    };

    if (isLoading) return <div>Loading configuration...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-lg border border-border/50">
                <div>
                    <h2 className="text-xl font-bold text-white">Event Configuration Registry</h2>
                    <p className="text-sm text-muted-foreground">Manage event definitions, durations, and file naming conventions.</p>
                </div>
                <Button variant="destructive" size="sm" onClick={resetToDefaults}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                </Button>
            </div>

            <div className="rounded-md border border-border/50 bg-black/20 backdrop-blur-sm">
                <ScrollArea className="h-[600px]">
                    <Table>
                        <TableHeader className="bg-muted/10 sticky top-0 backdrop-blur-md z-10">
                            <TableRow>
                                <TableHead className="w-[50px]">ID</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Event Name</TableHead>
                                <TableHead>Duration (s)</TableHead>
                                <TableHead>Modes</TableHead>
                                <TableHead>Interaction</TableHead>
                                <TableHead>Gamepad</TableHead>
                                <TableHead>Clip</TableHead>
                                <TableHead>Output Path Pattern</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.map((event) => (
                                <TableRow key={event.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-mono text-xs text-muted-foreground">{event.id}</TableCell>
                                    <TableCell><Badge variant="outline" className="bg-primary/10 border-primary/20">{event.category}</Badge></TableCell>
                                    <TableCell className="font-medium text-white">{event.label}</TableCell>
                                    <TableCell>{event.defaultDuration[0]}s - {event.defaultDuration[1]}s</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {event.isRealTime && <Badge variant="secondary" className="text-[10px]">LIVE</Badge>}
                                            {event.isPostMatch && <Badge variant="secondary" className="text-[10px]">POST</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {event.requiresZone && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">ZONE</Badge>}
                                            {event.requiresDuration && <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-500">DUR</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {event.gamepadMappings?.map((m, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px] bg-blue-500/10 border-blue-500/20 text-blue-400">
                                                    {m.modifier ? `${m.modifier}+` : ''}{m.isHold ? 'Hold ' : ''}{m.buttonIndex}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {event.clippingEnabled ? (
                                                <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-500">YES</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] border-red-500/50 text-red-500 opacity-50">NO</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]" title={event.folderPath + event.filenameConvention}>
                                        {event.folderPath}...{event.filenameConvention}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(event)}>
                                            <Edit2 className="w-4 h-4 text-primary" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Event: {editingEvent?.label}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Category</label>
                                <Input
                                    value={formData.category || ''}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Display Label</label>
                                <Input
                                    value={formData.label || ''}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Duration Min (s)</label>
                                <Input
                                    type="number"
                                    value={formData.defaultDuration?.[0] || 0}
                                    onChange={e => setFormData({ ...formData, defaultDuration: [parseInt(e.target.value), formData.defaultDuration?.[1] || 0] })}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Duration Max (s)</label>
                                <Input
                                    type="number"
                                    value={formData.defaultDuration?.[1] || 0}
                                    onChange={e => setFormData({ ...formData, defaultDuration: [formData.defaultDuration?.[0] || 0, parseInt(e.target.value)] })}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Folder Path</label>
                            <div className="text-[10px] text-muted-foreground mb-1">Use 'DATE' for match date placeholder.</div>
                            <Input
                                value={formData.folderPath || ''}
                                onChange={e => setFormData({ ...formData, folderPath: e.target.value })}
                                className="bg-black/50 border-white/10 font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Filename Convention</label>
                            <div className="text-[10px] text-muted-foreground mb-1">Use 'MIN' and 'SEC' as placeholders.</div>
                            <Input
                                value={formData.filenameConvention || ''}
                                onChange={e => setFormData({ ...formData, filenameConvention: e.target.value })}
                                className="bg-black/50 border-white/10 font-mono text-xs"
                            />
                        </div>

                        <div className="flex gap-6 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="realtime"
                                    checked={formData.isRealTime}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isRealTime: !!checked })}
                                />
                                <label htmlFor="realtime" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Live
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="postmatch"
                                    checked={formData.isPostMatch}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isPostMatch: !!checked })}
                                />
                                <label htmlFor="postmatch" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Post
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="requiresZone"
                                    checked={formData.requiresZone}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiresZone: !!checked })}
                                />
                                <label htmlFor="requiresZone" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Zone
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="requiresDuration"
                                    checked={formData.requiresDuration}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requiresDuration: !!checked })}
                                />
                                <label htmlFor="requiresDuration" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Duration
                                </label>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="clippingEnabled"
                                        checked={formData.clippingEnabled}
                                        onCheckedChange={(checked) => setFormData({ ...formData, clippingEnabled: !!checked })}
                                    />
                                    <label htmlFor="clippingEnabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Clip
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-white">Gamepad Mappings</label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddMapping} className="h-7 text-xs">
                                    <Plus className="w-3 h-3 mr-1" /> Add Mapping
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {(formData.gamepadMappings?.length === 0 || !formData.gamepadMappings) && (
                                    <div className="text-xs text-muted-foreground italic py-2 text-center bg-black/20 rounded">
                                        No mappings configured
                                    </div>
                                )}
                                {formData.gamepadMappings?.map((mapping, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-black/40 p-2 rounded border border-white/5">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground block mb-1">Binding (Modifier + Btn)</label>
                                            <VisualGamepadConfig
                                                showDebug={false}
                                                compact={true}
                                                value={{
                                                    buttonIndex: mapping.buttonIndex,
                                                    modifier: mapping.modifier
                                                }}
                                                onChange={(newVal) => {
                                                    // Update both fields at once to avoid race condition
                                                    const currentMappings = [...(formData.gamepadMappings || [])];
                                                    currentMappings[idx] = {
                                                        ...currentMappings[idx],
                                                        buttonIndex: newVal.buttonIndex,
                                                        modifier: newVal.modifier
                                                    };
                                                    setFormData({ ...formData, gamepadMappings: currentMappings });
                                                }}
                                            />
                                        </div>

                                        <div className="w-[80px]">
                                            <label className="text-[10px] text-muted-foreground block mb-1">Mode</label>
                                            <Select
                                                value={mapping.mode || 'LIVE'}
                                                onValueChange={(val) => handleUpdateMapping(idx, 'mode', val)}
                                            >
                                                <SelectTrigger className="h-7 text-xs bg-black/50 border-white/10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LIVE">Live</SelectItem>
                                                    <SelectItem value="POST">Post</SelectItem>
                                                    <SelectItem value="BOTH">Both</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center pt-5 px-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`hold-${idx}`}
                                                    checked={mapping.isHold || false}
                                                    onCheckedChange={(checked) => handleUpdateMapping(idx, 'isHold', checked === true)}
                                                />
                                                <label htmlFor={`hold-${idx}`} className="text-xs cursor-pointer">Hold</label>
                                            </div>
                                        </div>

                                        <div className="ml-auto pt-4">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleRemoveMapping(idx)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="gap-2">
                            <Save className="w-4 h-4" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
