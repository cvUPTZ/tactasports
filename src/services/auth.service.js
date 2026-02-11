import { API_BASE_URL } from '../utils/apiConfig.js';

export const DEFAULT_ROLE_PERMISSIONS = {
    'admin': ['*'], // Superuser access
    'operational_analyst': [
        'dashboard.view',
        'dashboard.live.view',
        'dashboard.live.match_control',
        'dashboard.live.voice',
        'dashboard.live.stream.view',
        'dashboard.export',
        'stats.view'
    ],
    'tactical_analyst': [
        'dashboard.view',
        'dashboard.post.view',
        'dashboard.post.upload',
        'dashboard.post.edit',
        'dashboard.post.delete',
        'dashboard.post.assign_player',
        'dashboard.export',
        'video.annotation',
        'video.player_tracking',
        'analytics.view',
        'analytics.advanced',
        'stats.view'
    ],
    'quality_controller': [
        'dashboard.view',
        'dashboard.live.view', // Can view live feed
        'dashboard.post.view', // Can view post match
        'qa.view',
        'qa.verify',
        'qa.bulk_verify',
        'qa.edit_metadata',
        'qa.resolve_pass',
        'monitoring.view',
        'stats.view',
        'community.view'
    ],
    'early_tester': [
        'dashboard.view',
        'dashboard.live.view',
        'dashboard.live.match_control', // Added for Collaboration (Live Input)
        'dashboard.post.view',
        'dashboard.post.edit',        // Added for Collaboration (Post-Match Input)
        'dashboard.export',
        'qa.view',
        'qa.verify',
        'qa.edit_metadata',
        'stats.view'
    ],
    'lead_analyst': [
        'dashboard.view',
        'dashboard.live.view',
        'stats.view',
        'qa.view',
        'monitoring.view'
    ],
    'live_tagger': [
        'dashboard.view',
        'dashboard.live.view',
        'dashboard.live.match_control',
        'dashboard.live.tagging' // Only this role can tag
    ],
    'eye_spotter': [
        'dashboard.view',
        'dashboard.live.view',
        'dashboard.live.voice'
    ],
    'logger': [
        'dashboard.view',
        'dashboard.live.view',
        'qa.view',
        'qa.verify',
        'monitoring.view'
    ]
};

// Mock In-Memory Database
// In a real app, this would be in a DB
const USERS = [
    { id: 1, username: 'admin', password: 'password', role: 'admin', name: 'Admin User', permissions: [] },
    { id: 2, username: 'analyst', password: 'password', role: 'operational_analyst', name: 'Operational Analyst', permissions: [] },
    { id: 3, username: 'tactical', password: 'password', role: 'tactical_analyst', name: 'Tactical Analyst', permissions: [] },
    { id: 4, username: 'qc', password: 'password', role: 'quality_controller', name: 'Quality Controller', permissions: [] },
    { id: 5, username: 'tester', password: 'password', role: 'early_tester', name: 'Early Tester', permissions: [] },
    { id: 6, username: 'lead', password: 'password', role: 'lead_analyst', name: 'Lead Analyst', permissions: [] },
    { id: 7, username: 'tagger', password: 'password', role: 'live_tagger', name: 'Live Tagger', permissions: [] },
    { id: 8, username: 'spotter', password: 'password', role: 'eye_spotter', name: 'Eye Spotter', permissions: [] },
    { id: 9, username: 'logger', password: 'password', role: 'logger', name: 'Logger', permissions: [] }
];

export const login = async (username, password) => {
    // In a real app, verify password hash
    console.log(`[AuthService] Verifying user: ${username}`);
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) {
        console.log('[AuthService] User not found');
        return null;
    }

    // Merge default role permissions with any user-specific overrides
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    const userSpecific = user.permissions || [];
    const effectivePermissions = [...new Set([...roleDefaults, ...userSpecific])];

    console.log(`[AuthService] User ${username} Role: ${user.role} Permissions: ${effectivePermissions.length}`);

    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

    // Return user without password but WITH permissions
    const { password: _, ...userWithoutPass } = user;
    return { token, user: { ...userWithoutPass, permissions: effectivePermissions } };
};

export const verifyToken = (token) => {
    // Real token verification and user lookup
    if (!token) return null;
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, timestamp] = decoded.split(':');

        const user = USERS.find(u => u.username === username);
        if (!user) return null;

        // Re-calculate permissions
        const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
        const userSpecific = user.permissions || [];
        const effectivePermissions = [...new Set([...roleDefaults, ...userSpecific])];

        const { password: _, ...userWithoutPass } = user;
        return { ...userWithoutPass, permissions: effectivePermissions };
    } catch (err) {
        console.error('[AuthService] Token verification failed:', err.message);
        return null;
    }
};

export const getAllUsers = async () => {
    return USERS.map(({ password, ...user }) => ({
        ...user,
        // Calculate and send their effective permissions so Admin UI can show them
        effectivePermissions: [...new Set([...(DEFAULT_ROLE_PERMISSIONS[user.role] || []), ...(user.permissions || [])])]
    }));
};

export const addUser = async (userData) => {
    const newUser = {
        id: USERS.length + 1,
        ...userData,
        permissions: userData.permissions || []
    };
    USERS.push(newUser);
    return { ...newUser, password: undefined };
};

export const deleteUser = async (id) => {
    const idx = USERS.findIndex(u => u.id === parseInt(id));
    if (idx !== -1) {
        USERS.splice(idx, 1);
        return true;
    }
    return false;
};

export const updateUser = async (id, updates) => {
    const idx = USERS.findIndex(u => u.id === parseInt(id));
    if (idx !== -1) {
        USERS[idx] = { ...USERS[idx], ...updates };
        const { password, ...userWithoutPass } = USERS[idx];
        return userWithoutPass;
    }
    return null;
};


