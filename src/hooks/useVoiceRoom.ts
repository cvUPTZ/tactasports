import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface PeerConnection {
    id: string; // Socket ID of the peer
    pc: RTCPeerConnection;
}

interface VoicePeer {
    id: string;
    name: string;
    role: string;
}

export const useVoiceRoom = (socket: Socket | null, userRole: string | undefined) => {
    const [isInRoom, setIsInRoom] = useState(false);
    const [peers, setPeers] = useState<VoicePeer[]>([]); // List of connected peers
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    // Helper: Create a peer connection
    const createPeerConnection = (targetId: string, stream: MediaStream): RTCPeerConnection => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.emit('voice-signal', {
                    to: targetId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        // Handle incoming stream (Remote Audio)
        pc.ontrack = (event) => {
            console.log(`🔊 Received audio track from ${targetId}`);

            // Avoid creating duplicate audio elements for same peer
            if (audioElementsRef.current.has(targetId)) return;

            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.autoplay = true;
            audio.volume = 1.0;
            // audio.muted = false; // By default false, but good to be explicit

            // Store ref for cleanup
            audioElementsRef.current.set(targetId, audio);
        };

        return pc;
    };

    const joinVoiceRoom = async () => {
        if (!socket) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Media Devices API not available (requires HTTPS or localhost)");
            alert("Microphone access is not supported in this environment (HTTPS required).");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1
                }
            });
            setLocalStream(stream);
            localStreamRef.current = stream;
            setIsInRoom(true);

            socket.emit('join-voice-room');
        } catch (err) {
            console.error("Failed to access microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const leaveVoiceRoom = () => {
        if (!socket) return;

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        // Cleanup Audio Elements
        audioElementsRef.current.forEach(audio => {
            audio.pause();
            audio.srcObject = null;
        });
        audioElementsRef.current.clear();

        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        setPeers([]);
        setIsInRoom(false);

        socket.emit('leave-voice-room');
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Socket Event Handlers
    useEffect(() => {
        if (!socket) return;

        // 1. Existing Users List (When WE join)
        const handleExistingUsers = async (users: VoicePeer[]) => {
            console.log("👥 Existing users in voice room:", users);
            setPeers(users);

            // Initiate calls to all existing users
            for (const user of users) {
                if (!localStreamRef.current) break;

                const pc = createPeerConnection(user.id, localStreamRef.current);
                peerConnections.current.set(user.id, pc);

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('voice-signal', {
                    to: user.id,
                    signal: { type: 'offer', sdp: pc.localDescription } // socket.io might need JSON primitive, but usually works with objects
                });
            }
        };

        // 2. New User Joined (They will call US)
        const handleUserJoined = (user: VoicePeer) => {
            console.log(`👤 User joined voice room: ${user.name} (${user.id})`);
            setPeers(prev => [...prev, user]);
        };

        // 3. User Left
        const handleUserLeft = (userId: string) => {
            console.log(`👋 User left voice room: ${userId}`);
            setPeers(prev => prev.filter(p => p.id !== userId));

            // Cleanup Audio
            if (audioElementsRef.current.has(userId)) {
                const audio = audioElementsRef.current.get(userId);
                audio?.pause();
                audioElementsRef.current.delete(userId);
            }

            const pc = peerConnections.current.get(userId);
            if (pc) {
                pc.close();
                peerConnections.current.delete(userId);
            }
        };

        // 4. Signaling (Offer/Answer/Candidate)
        const handleSignal = async (data: { from: string, signal: any }) => {
            const { from, signal } = data;

            // Allow receiving signals even if we haven't officially "joined" yet? 
            // In mesh, yes, we should be ready if we are in state to accept.
            // But realistically we only care if we are isInRoom. 
            // However, the 'join-voice-room' event triggers the flow, so we should be initialized.
            if (!localStreamRef.current) return;

            let pc = peerConnections.current.get(from);

            if (!pc) {
                // If we receive an offer from someone we don't know (e.g., they just joined and we are existing)
                if (signal.type === 'offer') {
                    pc = createPeerConnection(from, localStreamRef.current);
                    peerConnections.current.set(from, pc);
                } else {
                    console.warn("Received signal for unknown peer:", from);
                    return;
                }
            }

            try {
                if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('voice-signal', {
                        to: from,
                        signal: { type: 'answer', sdp: pc.localDescription }
                    });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                } else if (signal.type === 'candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (err) {
                console.error("Signaling error:", err);
            }
        };

        socket.on('voice-existing-users', handleExistingUsers);
        socket.on('voice-user-joined', handleUserJoined);
        socket.on('voice-user-left', handleUserLeft);
        socket.on('voice-signal', handleSignal);

        return () => {
            socket.off('voice-existing-users', handleExistingUsers);
            socket.off('voice-user-joined', handleUserJoined);
            socket.off('voice-user-left', handleUserLeft);
            socket.off('voice-signal', handleSignal);
        };
    }, [socket, isInRoom]); // Depend on isInRoom? Or just socket? 
    // Ideally just socket, but we need localStreamRef which is stable.

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            leaveVoiceRoom(); // Ensure cleanup
        };
    }, []);

    return {
        isInRoom,
        peers,
        isMuted,
        joinVoiceRoom,
        leaveVoiceRoom,
        toggleMute
    };
};
