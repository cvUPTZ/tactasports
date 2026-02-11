import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export const useAudioBroadcast = (socket: Socket | null, role: 'broadcaster' | 'viewer' | null) => {
    const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
    const [remoteAudioStream, setRemoteAudioStream] = useState<MediaStream | null>(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

    const startAudioBroadcast = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalAudioStream(stream);
            setIsBroadcasting(true);

            // Notify server that broadcaster is ready
            socket?.emit('audio-broadcaster-ready');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            throw err;
        }
    };

    const stopAudioBroadcast = () => {
        if (localAudioStream) {
            localAudioStream.getTracks().forEach(track => track.stop());
            setLocalAudioStream(null);
        }

        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();

        setIsBroadcasting(false);
        socket?.emit('audio-broadcast-stopped');
    };

    // Broadcaster: Handle new watchers
    useEffect(() => {
        if (role !== 'broadcaster' || !localAudioStream) return;

        const handleAudioWatcher = async (watcherId: string) => {
            console.log('Audio watcher connected:', watcherId);

            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Add audio track to peer connection
            localAudioStream.getAudioTracks().forEach(track => {
                peerConnection.addTrack(track, localAudioStream);
            });

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit('audio-candidate', {
                        candidate: event.candidate,
                        to: watcherId
                    });
                }
            };

            // Create and send offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket?.emit('audio-offer', {
                offer: peerConnection.localDescription,
                to: watcherId
            });

            peerConnections.current.set(watcherId, peerConnection);
        };

        if (!socket) return;
        socket.on('audio-watcher', handleAudioWatcher);

        return () => {
            socket.off('audio-watcher', handleAudioWatcher);
        };
    }, [role, localAudioStream, socket]);

    // Viewer: Request to watch and handle offer
    useEffect(() => {
        if (role !== 'viewer') return;

        // Notify broadcaster that we want to watch
        socket?.emit('audio-watcher');

        const handleAudioOffer = async (data: { offer: RTCSessionDescriptionInit, from: string }) => {
            console.log('Received audio offer from:', data.from);

            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // Handle incoming audio stream
            peerConnection.ontrack = (event) => {
                console.log('Received remote audio track');
                setRemoteAudioStream(event.streams[0]);
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket?.emit('audio-candidate', {
                        candidate: event.candidate,
                        to: data.from
                    });
                }
            };

            // Set remote description and create answer
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket?.emit('audio-answer', {
                answer: peerConnection.localDescription,
                to: data.from
            });

            peerConnections.current.set(data.from, peerConnection);
        };

        if (!socket) return;
        socket.on('audio-offer', handleAudioOffer);

        return () => {
            socket.off('audio-offer', handleAudioOffer);
        };
    }, [role, socket]);

    // Handle ICE candidates (both broadcaster and viewer)
    useEffect(() => {
        const handleAudioCandidate = async (data: { candidate: RTCIceCandidateInit, from: string }) => {
            const peerConnection = peerConnections.current.get(data.from);
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };

        if (!socket) return;
        socket.on('audio-candidate', handleAudioCandidate);

        return () => {
            socket.off('audio-candidate', handleAudioCandidate);
        };
    }, [socket]);

    // Handle answer (broadcaster only)
    useEffect(() => {
        if (role !== 'broadcaster') return;

        const handleAudioAnswer = async (data: { answer: RTCSessionDescriptionInit, from: string }) => {
            const peerConnection = peerConnections.current.get(data.from);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        };

        if (!socket) return;
        socket.on('audio-answer', handleAudioAnswer);

        return () => {
            socket.off('audio-answer', handleAudioAnswer);
        };
    }, [role, socket]);

    // Handle broadcast stopped (viewer only)
    useEffect(() => {
        if (role !== 'viewer') return;

        const handleAudioBroadcastStopped = () => {
            setRemoteAudioStream(null);
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
        };

        if (!socket) return;
        socket.on('audio-broadcast-stopped', handleAudioBroadcastStopped);

        return () => {
            socket.off('audio-broadcast-stopped', handleAudioBroadcastStopped);
        };
    }, [role, socket]);

    return {
        localAudioStream,
        remoteAudioStream,
        isBroadcasting,
        startAudioBroadcast,
        stopAudioBroadcast
    };
};
