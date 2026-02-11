import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

export const useWebRTC = (socket: Socket, role: 'broadcaster' | 'viewer' | null) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null); // Ref to access current stream in callbacks

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    const startStreaming = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false // Or true if we want audio
            });
            setLocalStream(stream);
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error("Error accessing display media:", err);
            return null;
        }
    }, []);

    useEffect(() => {
        if (!socket || !role) return;

        const handleWatcher = async (id: string) => {
            console.log("New watcher:", id);
            const peerConnection = new RTCPeerConnection(CONFIG);
            peerConnections.current[id] = peerConnection;

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStreamRef.current!);
                });
            }

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("candidate", id, event.candidate);
                }
            };

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("offer", id, peerConnection.localDescription);
        };

        const handleOffer = async (id: string, description: RTCSessionDescriptionInit) => {
            console.log("Received offer from:", id);
            const peerConnection = new RTCPeerConnection(CONFIG);
            peerConnections.current[id] = peerConnection;

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("candidate", id, event.candidate);
                }
            };

            peerConnection.ontrack = (event) => {
                console.log("Received remote track");
                setRemoteStream(event.streams[0]);
            };

            await peerConnection.setRemoteDescription(description);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit("answer", id, peerConnection.localDescription);
        };

        const handleAnswer = async (id: string, description: RTCSessionDescriptionInit) => {
            console.log("Received answer from:", id);
            const peerConnection = peerConnections.current[id];
            if (peerConnection) {
                await peerConnection.setRemoteDescription(description);
            }
        };

        const handleCandidate = async (id: string, candidate: RTCIceCandidateInit) => {
            const peerConnection = peerConnections.current[id];
            if (peerConnection) {
                try {
                    await peerConnection.addIceCandidate(candidate);
                } catch (e) {
                    console.error("Error adding candidate:", e);
                }
            }
        };

        const handleStreamEnded = () => {
            setRemoteStream(null);
            // Close all connections?
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
        };

        socket.on("watcher", handleWatcher);
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("candidate", handleCandidate);
        socket.on("stream-ended", handleStreamEnded);

        if (role === 'viewer') {
            socket.emit("watcher");
        }

        return () => {
            socket.off("watcher", handleWatcher);
            socket.off("offer", handleOffer);
            socket.off("answer", handleAnswer);
            socket.off("candidate", handleCandidate);
            socket.off("stream-ended", handleStreamEnded);

            // Cleanup connections on unmount
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
        };
    }, [socket, role]);

    return { localStream, remoteStream, startStreaming };
};
