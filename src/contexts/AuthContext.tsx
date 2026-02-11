import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL, API_HEADERS } from '@/utils/apiConfig';

export type UserRole = 'operational_analyst' | 'tactical_analyst' | 'quality_controller' | 'early_tester' | 'admin' | 'lead_analyst' | 'live_tagger' | 'eye_spotter' | 'logger';

export interface User {
    id: number;
    username: string;
    role: UserRole;
    name: string;
    permissions: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('tacta_user');
        try {
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error("Failed to parse initial user", e);
            return null;
        }
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('tacta_token'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('tacta_token'));

    useEffect(() => {
        const storedUser = localStorage.getItem('tacta_user');
        const storedToken = localStorage.getItem('tacta_token');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse user data", e);
                logout();
            }
        } else if (storedToken && !storedUser) {
            console.warn("Found token but no user data, logging out to ensure consistency");
            logout();
        }
    }, []);

    const hasPermission = (permission: string): boolean => {
        if (!user || !user.permissions) return false;

        // Admin wildcard
        if (user.permissions.includes('*')) return true;

        // Exact match
        if (user.permissions.includes(permission)) return true;

        // Check for category wildcards (e.g. 'dashboard.*' matches 'dashboard.view')
        const wildcardPermissions = user.permissions.filter(p => p.endsWith('.*'));
        for (const wp of wildcardPermissions) {
            const prefix = wp.slice(0, -2);
            if (permission.startsWith(prefix)) return true;
        }

        return false;
    };

    const login = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            setToken(data.token);
            setUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem('tacta_token', data.token);
            localStorage.setItem('tacta_user', JSON.stringify(data.user));
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('tacta_token');
        localStorage.removeItem('tacta_user');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
