import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_SOCKET_URL } from '@/utils/apiConfig';
import { useAuth } from './AuthContext';

interface SocketContextValue {
    socket: Socket | null;
    connected: boolean;
    role: string | null;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    connected: false,
    role: null,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { token } = useAuth();
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        // Don't attempt to connect if there's no token
        if (!token) {
            if (socketRef.current) {
                console.info('[socket] User logged out, disconnecting socket.');
                socketRef.current.disconnect();
                socketRef.current = null;
                setConnected(false);
                setRole(null);
            }
            return;
        }

        console.info('[socket] Token available, connecting...');

        const socket = io(API_SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket'],
            timeout: 5000,
            reconnectionAttempts: 5,
            auth: {
                token,
            },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[socket] connected:', socket.id);
            setConnected(true);
        });

        socket.on('role-assignment', (newRole: string) => {
            console.log('[socket] role-assigned:', newRole);
            setRole(newRole);
        });

        socket.on('disconnect', (reason) => {
            console.warn('[socket] disconnected:', reason);
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.error('[socket] connect error:', err.message);
        });

        return () => {
            console.info('[socket] Cleaning up connection...');
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [token]);

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                connected,
                role,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
