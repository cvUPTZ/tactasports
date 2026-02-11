
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Shield, Key, Edit, Save, Video, Settings } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, API_HEADERS } from '@/utils/apiConfig';
import { EventConfigTable } from '@/components/Admin/EventConfigTable';

const PERMISSION_CATEGORIES = {
    'Dashboard': [
        'dashboard.view', 'dashboard.live.view', 'dashboard.live.match_control',
        'dashboard.live.voice', 'dashboard.live.stream.view', 'dashboard.live.stream.manage',
        'dashboard.post.view', 'dashboard.post.upload', 'dashboard.export'
    ],
    'Post-Match Editing': [
        'dashboard.post.edit', 'dashboard.post.delete', 'dashboard.post.assign_player'
    ],
    'Video & Telestration': [
        'video.annotation', 'video.calibration', 'video.player_tracking',
        'video.export_data', 'video.import_data'
    ],
    'Quality & Crowd': [
        'qa.view', 'qa.verify', 'qa.bulk_verify', 'qa.edit_metadata', 'qa.resolve_pass',
        'crowd.request', 'monitoring.view'
    ],
    'Analytics': [
        'analytics.view', 'analytics.advanced', 'analytics.kpi', 'stats.view'
    ],
    'Admin & Config': [
        'admin.view', 'admin.users', 'config.controller', 'config.teams', 'community.view'
    ]
};

export default function AdminPortal() {
    const { toast } = useToast();
    const { logout } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operational_analyst', name: '' });

    // Permission Editing State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('tacta_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    ...API_HEADERS,
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        }
    };

    const handleAddUser = async () => {
        try {
            const token = localStorage.getItem('tacta_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    ...API_HEADERS,
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newUser)
            });

            if (response.ok) {
                toast({ title: "User Added", description: `${newUser.username} created successfully.` });
                setNewUser({ username: '', password: '', role: 'operational_analyst', name: '' });
                fetchUsers();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
        }
    };

    const handleDeleteUser = async (id: number) => {
        try {
            const token = localStorage.getItem('tacta_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    ...API_HEADERS,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast({ title: "User Deleted" });
                fetchUsers();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
        }
    };

    const openPermissionEditor = (user: any) => {
        setEditingUser(user);
        setSelectedPermissions(user.effectivePermissions || []);
    };

    const togglePermission = (perm: string) => {
        setSelectedPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const [autoExtract, setAutoExtract] = useState(() => localStorage.getItem('tacta_auto_extract') === 'true');

    const toggleAutoExtract = (checked: boolean) => {
        setAutoExtract(checked);
        localStorage.setItem('tacta_auto_extract', checked.toString());
        toast({ title: checked ? "Auto-Clip Enabled" : "Auto-Clip Disabled", description: "Global setting updated." });
    };

    const savePermissions = async () => {
        if (!editingUser) return;
        try {
            const token = localStorage.getItem('tacta_token');
            // We are saving the explicit list. The backend might merge or replace.
            const response = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    ...API_HEADERS,
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permissions: selectedPermissions })
            });

            if (response.ok) {
                toast({ title: "Permissions Updated", description: `Access rights updated for ${editingUser.username}` });
                setEditingUser(null);
                fetchUsers();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Portal</h1>
                    <p className="text-slate-400">System Configuration & User Management</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.location.href = '/'}>Back to Dashboard</Button>
                    <Button variant="destructive" onClick={logout}>Logout</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create User */}
                <Card className="bg-slate-900 border-slate-800 lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-500" /> Create User</CardTitle>
                        <CardDescription>Add a new analyst or controller to the system.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                            <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Username</label>
                            <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="jdoe" className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Password</label>
                            <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••" className="bg-slate-950 border-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Role</label>
                            <select
                                className="w-full h-10 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="operational_analyst">Operational Analyst</option>
                                <option value="tactical_analyst">Tactical Analyst</option>
                                <option value="quality_controller">Quality Controller</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAddUser}>
                            Create Account
                        </Button>
                    </CardContent>
                </Card>

                {/* User List */}
                <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-500" /> System Users</CardTitle>
                        <CardDescription>Manage access capabilities and permissions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-slate-800">
                                    <TableHead className="text-slate-400">User</TableHead>
                                    <TableHead className="text-slate-400">Role</TableHead>
                                    <TableHead className="text-slate-400">Permissions</TableHead>
                                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(u => (
                                    <TableRow key={u.id} className="hover:bg-slate-800/50 border-slate-800">
                                        <TableCell>
                                            <div className="font-medium text-slate-200">{u.name}</div>
                                            <div className="text-xs text-slate-500">@{u.username}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-950 border-slate-700 text-slate-400 font-mono">
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {u.effectivePermissions?.includes('*') ? (
                                                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">SUPERUSER</Badge>
                                                ) : (
                                                    <>
                                                        <Badge variant="secondary" className="text-[10px]">{u.effectivePermissions?.length || 0} active</Badge>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Dialog open={editingUser?.id === u.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openPermissionEditor(u)}
                                                            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-slate-50">
                                                        <DialogHeader>
                                                            <DialogTitle>Edit Permissions: {editingUser?.name}</DialogTitle>
                                                            <DialogDescription>
                                                                Toggle specific capabilities. These override role defaults.
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 py-4 max-h-[60vh] overflow-y-auto">
                                                            {Object.entries(PERMISSION_CATEGORIES).map(([cat, perms]) => (
                                                                <div key={cat} className="space-y-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                                                    <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 mb-2">{cat}</h4>
                                                                    <div className="space-y-2">
                                                                        {perms.map(perm => (
                                                                            <div key={perm} className="flex items-start gap-2">
                                                                                <Checkbox
                                                                                    id={perm}
                                                                                    checked={selectedPermissions.includes(perm) || selectedPermissions.includes('*')}
                                                                                    onCheckedChange={() => togglePermission(perm)}
                                                                                    disabled={selectedPermissions.includes('*')} // Cannot uncheck if superuser
                                                                                    className="data-[state=checked]:bg-blue-600 border-slate-600"
                                                                                />
                                                                                <label
                                                                                    htmlFor={perm}
                                                                                    className="text-xs font-mono text-slate-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pt-0.5"
                                                                                >
                                                                                    {perm}
                                                                                </label>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <DialogFooter>
                                                            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                                                            <Button onClick={savePermissions} className="bg-blue-600 hover:bg-blue-700">
                                                                <Save className="w-4 h-4 mr-2" /> Save Changes
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Global System Settings */}
                <Card className="bg-slate-900 border-slate-800 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-gray-400" /> Global System Settings</CardTitle>
                        <CardDescription>Configure system-wide automation and behavior.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950/50 border border-slate-800">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium text-white flex items-center gap-2">
                                    <Video className="w-4 h-4 text-purple-400" /> Auto-Clip Extraction
                                </label>
                                <p className="text-xs text-slate-400">
                                    Automatically create 10s video clips when events are tagged (requires video source).
                                </p>
                            </div>
                            <Switch
                                checked={autoExtract}
                                onCheckedChange={toggleAutoExtract}
                                className="data-[state=checked]:bg-purple-600"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Event Configuration (Full Width) */}
                <Card className="bg-slate-900 border-slate-800 lg:col-span-3">
                    <CardContent className="p-0">
                        <EventConfigTable />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
