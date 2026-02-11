// src/socket/handlers.js
import { state, broadcasterId, setBroadcasterId, resetBroadcaster } from '../config/state.js';
import OBSWebSocket from 'obs-websocket-js';

const obsInstances = new Map(); // Map socket.id -> OBSWebSocket instance

export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        // Send current state to new client
        socket.emit('sync-state', state);
        console.log(`Sent initial state. Teams: ${state.teams.length}, Selected: ${state.selectedTeam}`);

        // Assign broadcaster/viewer role based on authenticated user data
        const role = (socket.user?.role === 'admin' || socket.user?.role === 'live_tagger') ? 'broadcaster' : 'viewer';

        if (role === 'broadcaster') {
            setBroadcasterId(socket.id);
            console.log(`🎭 Assigned AUTHORITATIVE role to ${socket.id} (${socket.user?.role})`);
        }

        socket.emit('role-assignment', role);
        console.log(`👤 Client ${socket.id} role: ${role}`);

        // Test Connection Handler
        socket.on('test-connection', (data) => {
            console.log('✅✅✅ TEST CONNECTION RECEIVED:', data);
            socket.emit('test-response', {
                message: 'Socket is working!',
                received: data,
                timestamp: new Date().toISOString()
            });
        });

        // WebRTC Signaling (Video)
        socket.on('watcher', () => {
            if (broadcasterId) io.to(broadcasterId).emit('watcher', socket.id);
        });
        socket.on('offer', (id, message) => io.to(id).emit('offer', socket.id, message));
        socket.on('answer', (id, message) => io.to(id).emit('answer', socket.id, message));
        socket.on('candidate', (id, message) => io.to(id).emit('candidate', socket.id, message));

        // WebRTC Signaling (Audio)
        socket.on('audio-watcher', () => {
            if (broadcasterId) io.to(broadcasterId).emit('audio-watcher', socket.id);
        });
        socket.on('audio-broadcaster-ready', () => socket.broadcast.emit('audio-broadcaster-ready'));
        socket.on('audio-offer', (data) => io.to(data.to).emit('audio-offer', { offer: data.offer, from: socket.id }));
        socket.on('audio-answer', (data) => io.to(data.to).emit('audio-answer', { answer: data.answer, from: socket.id }));
        socket.on('audio-candidate', (data) => io.to(data.to).emit('audio-candidate', { candidate: data.candidate, from: socket.id }));
        socket.on('audio-broadcast-stopped', () => socket.broadcast.emit('audio-broadcast-stopped'));

        // WebRTC Signaling (Audio - Multi-User Voice Room)
        socket.on('join-voice-room', () => {
            // 1. Get existing users with their info
            const voiceUsers = Array.from(io.sockets.sockets.values())
                .filter(s => s.voiceRoomJoined && s.id !== socket.id)
                .map(s => ({
                    id: s.id,
                    name: s.user?.username || 'Unknown',
                    role: s.user?.role || 'user'
                }));

            socket.voiceRoomJoined = true;
            console.log(`🎙️ User joined voice room: ${socket.id} (${socket.user?.username})`);

            // 2. Tell existing users about the new user (with info)
            const newUserInfo = {
                id: socket.id,
                name: socket.user?.username || 'Unknown',
                role: socket.user?.role || 'user'
            };

            Array.from(io.sockets.sockets.values())
                .filter(s => s.voiceRoomJoined && s.id !== socket.id)
                .forEach(s => {
                    io.to(s.id).emit('voice-user-joined', newUserInfo);
                });

            // 3. Send list of existing users to the new user
            socket.emit('voice-existing-users', voiceUsers);
        });

        socket.on('leave-voice-room', () => {
            socket.voiceRoomJoined = false;
            console.log(`🔇 User left voice room: ${socket.id}`);
            socket.broadcast.emit('voice-user-left', socket.id);
        });

        socket.on('voice-signal', (data) => {
            // Relay WebRTC signals (offer, answer, candidate) to the specific peer
            io.to(data.to).emit('voice-signal', {
                signal: data.signal,
                from: socket.id
            });
        });

        // Data Synchronization
        socket.on('new-event', (event) => {
            console.log('New event received:', event.eventName);
            state.events.push(event);
            socket.broadcast.emit('new-event', event);
        });

        socket.on('update-event', (updatedEvent) => {
            console.log('Event update received:', updatedEvent.id);
            const index = state.events.findIndex(e => e.id === updatedEvent.id);
            if (index !== -1) {
                state.events[index] = updatedEvent;
                socket.broadcast.emit('update-event', updatedEvent);
            }
        });

        socket.on('sync-timer', (data) => {
            state.matchTime = data.matchTime;
            state.isMatchActive = data.isMatchActive;
            socket.broadcast.emit('sync-timer', data);
        });

        socket.on('sync-teams', (teams) => {
            console.log(`Syncing teams: Received ${teams.length} teams.`);
            state.teams = teams;
            socket.broadcast.emit('sync-teams', teams);
        });

        socket.on('select-team', (teamId) => {
            console.log(`Team Selected: ${teamId}`);
            state.selectedTeam = teamId;
            socket.broadcast.emit('select-team', teamId);
        });

        socket.on('undo-event', (eventId) => {
            console.log(`Undo event: ${eventId}`);
            state.events = state.events.filter(e => e.id !== eventId);
            socket.broadcast.emit('undo-event', eventId);
        });

        // Video Sync
        socket.on('video-sync', (data) => {
            console.log(`Video sync: time=${data.currentTime?.toFixed(2)}s, playing=${data.isPlaying}, rate=${data.playbackRate}`);
            state.videoState = {
                currentTime: data.currentTime || 0,
                isPlaying: data.isPlaying || false,
                playbackRate: data.playbackRate || 1.0,
                videoUrl: data.videoUrl || state.videoState.videoUrl
            };
            socket.broadcast.emit('video-sync', state.videoState);
        });

        socket.on('video-play', (currentTime) => {
            console.log(`Video play at: ${currentTime?.toFixed(2)}s`);
            state.videoState.isPlaying = true;
            state.videoState.currentTime = currentTime || 0;
            socket.broadcast.emit('video-play', currentTime);
        });

        socket.on('video-pause', (currentTime) => {
            console.log(`Video pause at: ${currentTime?.toFixed(2)}s`);
            state.videoState.isPlaying = false;
            state.videoState.currentTime = currentTime || 0;
            socket.broadcast.emit('video-pause', currentTime);
        });

        socket.on('video-seek', (currentTime) => {
            console.log(`Video seek to: ${currentTime?.toFixed(2)}s`);
            state.videoState.currentTime = currentTime || 0;
            socket.broadcast.emit('video-seek', currentTime);
        });

        socket.on('video-loaded', (videoUrl) => {
            console.log(`Video loaded: ${videoUrl}`);
            state.videoState.videoUrl = videoUrl;
            state.videoState.currentTime = 0;
            state.videoState.isPlaying = false;
            socket.broadcast.emit('video-loaded', videoUrl);
        });

        // Session Controls
        socket.on('start-session', () => {
            console.log('🚀 Session started by admin');
            state.isSessionStarted = true;
            io.emit('session-started');
        });

        socket.on('video-mode-sync', (data) => {
            console.log(`📹 Video mode sync: ${data.mode}, useVideo: ${data.useVideoMode}`);
            state.videoMode = data.mode;
            state.useVideoMode = data.useVideoMode;
            socket.broadcast.emit('video-mode-change', data);
        });

        socket.on('match-state-sync', (data) => {
            // Update global state
            if (data.streamUrl !== undefined) state.streamUrl = data.streamUrl;
            if (data.videoMode !== undefined) state.videoMode = data.videoMode;
            if (data.useVideoMode !== undefined) state.useVideoMode = data.useVideoMode;
            if (data.isSessionStarted !== undefined) state.isSessionStarted = data.isSessionStarted;

            // Broadcast to all other clients
            socket.broadcast.emit('match-state-remote-sync', data);
        });

        // ===== OBS PROXY ===== (SUPER VERBOSE LOGGING)
        socket.on('obs-proxy-connect', async ({ address, password }) => {
            console.log('');
            console.log('═══════════════════════════════════════════════════');
            console.log('🔌 OBS PROXY CONNECT EVENT RECEIVED');
            console.log('═══════════════════════════════════════════════════');
            console.log('Socket ID:', socket.id);
            console.log('Address:', address);
            console.log('Password:', password ? '[SET]' : '[NOT SET]');
            console.log('Time:', new Date().toISOString());
            console.log('═══════════════════════════════════════════════════');
            console.log('');

            try {
                // Validate input
                if (!address || typeof address !== 'string') {
                    throw new Error('Invalid OBS WebSocket address');
                }

                // Cleanup existing connection if any
                if (obsInstances.has(socket.id)) {
                    console.log(`🧹 Cleaning up existing OBS connection for ${socket.id}`);
                    try {
                        await obsInstances.get(socket.id).disconnect();
                    } catch (e) {
                        console.warn('⚠️ Error disconnecting previous OBS:', e.message);
                    }
                    obsInstances.delete(socket.id);
                }

                // Create new OBS instance
                console.log('📦 Creating new OBS WebSocket instance...');
                const obs = new OBSWebSocket();
                console.log('✅ OBS WebSocket instance created');

                // Set up event listeners BEFORE connecting
                obs.on('ConnectionClosed', () => {
                    console.log(`❌ OBS Connection Closed for ${socket.id}`);
                    socket.emit('obs-proxy-disconnected');
                    obsInstances.delete(socket.id);
                });

                obs.on('RecordStateChanged', (data) => {
                    console.log(`📹 Record State Changed for ${socket.id}:`, data);
                    socket.emit('obs-proxy-event', {
                        event: 'RecordStateChanged',
                        data
                    });
                });

                obs.on('StreamStateChanged', (data) => {
                    console.log(`📡 Stream State Changed for ${socket.id}:`, data);
                    socket.emit('obs-proxy-event', {
                        event: 'StreamStateChanged',
                        data
                    });
                });

                obs.on('ConnectionError', (err) => {
                    console.error(`❌ OBS Connection Error for ${socket.id}:`, err);
                    socket.emit('obs-proxy-error', {
                        message: `Connection error: ${err.message}`
                    });
                });

                console.log('🎧 Event listeners attached');

                // Connect with proper configuration
                const connectionOptions = {
                    rpcVersion: 1,
                    eventSubscriptions: 0xFFFF
                };

                console.log('🔄 Calling obs.connect()...');
                console.log('   Address:', address);
                console.log('   Password:', password ? '[HIDDEN]' : 'undefined');
                console.log('   Options:', connectionOptions);

                await obs.connect(address, password || undefined, connectionOptions);

                console.log('✅✅✅ OBS CONNECTED SUCCESSFULLY! ✅✅✅');

                // Store the instance
                obsInstances.set(socket.id, obs);

                console.log('📤 Emitting obs-proxy-connected to client...');
                socket.emit('obs-proxy-connected', { address });
                console.log('✅ Event emitted');

            } catch (err) {
                console.log('');
                console.log('╔═══════════════════════════════════════════════════╗');
                console.log('║  ❌ OBS CONNECTION FAILED                         ║');
                console.log('╚═══════════════════════════════════════════════════╝');
                console.error('Error Type:', err.constructor.name);
                console.error('Error Message:', err.message);
                console.error('Error Code:', err.code);
                console.error('Error Stack:', err.stack);
                console.log('═══════════════════════════════════════════════════');

                let errorMessage = 'Failed to connect to OBS';
                let errorCode = err.code;

                if (err.code === 'ECONNREFUSED') {
                    errorMessage = 'Connection refused. Make sure OBS is running and WebSocket server is enabled (Tools → WebSocket Server Settings).';
                } else if (err.code === 'ETIMEDOUT' || err.code === 'TIMEOUT') {
                    errorMessage = 'Connection timeout. Check the OBS address and ensure port 4455 is not blocked by firewall.';
                } else if (err.code === 'ENOTFOUND') {
                    errorMessage = `Host not found. Check the OBS WebSocket address: ${address}`;
                } else if (err.message?.toLowerCase().includes('authentication') ||
                    err.message?.toLowerCase().includes('password')) {
                    errorMessage = 'Authentication failed. Check your OBS WebSocket password in Tools → WebSocket Server Settings.';
                } else if (err.message?.toLowerCase().includes('rpc')) {
                    errorMessage = 'OBS WebSocket version mismatch. Make sure you have OBS Studio v28.0+ installed.';
                } else if (err.message) {
                    errorMessage = err.message;
                }

                // Cleanup
                if (obsInstances.has(socket.id)) {
                    try {
                        await obsInstances.get(socket.id).disconnect();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    obsInstances.delete(socket.id);
                }

                console.log('📤 Emitting obs-proxy-error to client...');
                socket.emit('obs-proxy-error', {
                    message: errorMessage,
                    code: errorCode
                });
                console.log('✅ Error event emitted');
            }
        });

        socket.on('obs-proxy-call', async ({ requestType, requestData, requestId }) => {
            console.log(`📞 OBS Proxy Call [${requestId}] from ${socket.id}: ${requestType}`);

            const obs = obsInstances.get(socket.id);

            if (!obs) {
                console.error(`❌ No OBS instance for ${socket.id}`);
                return socket.emit('obs-proxy-error', {
                    message: 'OBS not connected. Please connect to OBS first.',
                    requestId
                });
            }

            try {
                const response = await obs.call(requestType, requestData || {});
                console.log(`✅ OBS Call Success [${requestId}]:`, requestType);
                socket.emit('obs-proxy-response', { response, requestId });
            } catch (err) {
                console.error(`❌ OBS Call Failed [${requestId}]:`, err.message);

                let errorMessage = err.message || 'OBS request failed';

                // Provide more context for common errors
                if (err.message?.includes('not recording')) {
                    errorMessage = 'OBS is not currently recording';
                } else if (err.message?.includes('already recording')) {
                    errorMessage = 'OBS is already recording';
                } else if (err.message?.includes('not streaming')) {
                    errorMessage = 'OBS is not currently streaming';
                } else if (err.message?.includes('already streaming')) {
                    errorMessage = 'OBS is already streaming';
                }

                socket.emit('obs-proxy-error', {
                    message: errorMessage,
                    code: err.code,
                    requestId
                });
            }
        });

        socket.on('obs-proxy-disconnect', async () => {
            console.log(`🔌 OBS Proxy Disconnect Request from ${socket.id}`);

            const obs = obsInstances.get(socket.id);
            if (obs) {
                try {
                    await obs.disconnect();
                    console.log(`✅ OBS disconnected for ${socket.id}`);
                } catch (err) {
                    console.warn(`⚠️ Error disconnecting OBS for ${socket.id}:`, err.message);
                }
                obsInstances.delete(socket.id);
                socket.emit('obs-proxy-disconnected');
            } else {
                console.log(`ℹ️ No OBS connection to disconnect for ${socket.id}`);
                socket.emit('obs-proxy-disconnected');
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            // Cleanup OBS if any
            if (obsInstances.has(socket.id)) {
                console.log(`🧹 Cleaning up OBS connection for disconnected socket ${socket.id}`);
                obsInstances.get(socket.id).disconnect()
                    .then(() => console.log(`✅ OBS cleaned up for ${socket.id}`))
                    .catch((err) => console.warn(`⚠️ Error cleaning up OBS:`, err.message));
                obsInstances.delete(socket.id);
            }

            // Cleanup voice room
            if (socket.voiceRoomJoined) {
                socket.broadcast.emit('voice-user-left', socket.id);
            }

            if (socket.id === broadcasterId) {
                resetBroadcaster();
                socket.broadcast.emit('stream-ended');
                console.log('Broadcaster disconnected. Role reset.');
            }
        });
    });
}