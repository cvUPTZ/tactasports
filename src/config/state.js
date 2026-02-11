// src/config/state.js - Application state management
export const state = {
    events: [],
    matchTime: 0,
    isMatchActive: false,
    selectedTeam: "",
    teams: [],
    videoState: {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.0,
        videoUrl: ""
    },
    isSessionStarted: false,
    videoMode: 'live',
    useVideoMode: true,
    streamUrl: ""
};

export let broadcasterId = null;

export function setBroadcasterId(id) {
    broadcasterId = id;
}

export function resetBroadcaster() {
    broadcasterId = null;
}
