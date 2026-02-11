/**
 * Safely get environment variables in both Vite (frontend) and Node (backend)
 */
const getEnv = (key) => {
    // Vite (frontend)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }

    // Node (backend)
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }

    return undefined;
};

/**
 * HTTP API base URL
 * Example: http://localhost:3001/api
 */
export const API_BASE_URL = (() => {
    const envUrl = getEnv('VITE_API_BASE_URL');

    if (envUrl !== undefined) {
        return envUrl;
    }

    // Same-origin fallback (Vite proxy or monolith)
    return '';
})();

/**
 * Socket.IO base URL
 * MUST NOT include `/api`
 * Example: http://localhost:3001
 */
export const API_SOCKET_URL = (() => {
    const envUrl = getEnv('VITE_SOCKET_URL');

    if (envUrl !== undefined) {
        return envUrl;
    }

    // Auto-fix if API_BASE_URL ends with `/api`
    if (API_BASE_URL.endsWith('/api')) {
        return API_BASE_URL.replace(/\/api$/, '');
    }

    return API_BASE_URL;
})();

/**
 * Optional secondary API (analysis, AI, etc.)
 */
export const ANALYSIS_API_URL =
    getEnv('VITE_ANALYSIS_API_URL') || API_BASE_URL;

/**
 * Default API headers
 */
export const API_HEADERS = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'Bypass-Tunnel-Reminder': 'true',
};

/**
 * Headers forbidden by browsers
 */
export const FORBIDDEN_HEADERS = [
    'user-agent',
    'referer',
    'host',
    'origin',
    'connection',
    'cookie',
    'accept-charset',
    'accept-encoding',
];

/**
 * Remove forbidden headers
 */
export const filterSafeHeaders = (headers) => {
    if (!headers || typeof headers !== 'object') return {};

    const safeHeaders = {};

    Object.entries(headers).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();

        const isForbidden = FORBIDDEN_HEADERS.some(
            (forbidden) =>
                lowerKey === forbidden ||
                lowerKey.startsWith('sec-') ||
                lowerKey.startsWith('proxy-')
        );

        if (!isForbidden) {
            safeHeaders[key] = value;
        } else {
            console.warn(`Skipping forbidden header: ${key}`);
        }
    });

    return safeHeaders;
};

/**
 * Create safe fetch options
 */
export const createFetchOptions = (customHeaders = {}) => {
    return {
        headers: filterSafeHeaders({
            ...API_HEADERS,
            ...customHeaders,
        }),
    };
};

// Debug log
console.log('API Configuration Loaded:', {
    API_BASE_URL,
    API_SOCKET_URL,
    ANALYSIS_API_URL,
});
