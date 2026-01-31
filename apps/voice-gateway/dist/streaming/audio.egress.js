"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioEgress = void 0;
const rtc_node_1 = require("@livekit/rtc-node");
class AudioEgress {
    constructor() {
        this.activeSources = new Map();
    }
    addActiveSource(callId, source) {
        this.activeSources.set(callId, source);
        console.log(`[EGRESS] Added active source for call ${callId}`);
    }
    removeActiveSource(callId) {
        this.activeSources.delete(callId);
        console.log(`[EGRESS] Removed active source for call ${callId}`);
    }
    publishAudio(callId, frame) {
        const source = this.activeSources.get(callId);
        if (!source)
            return;
        try {
            if (!this.isValid(frame))
                return;
            const lkFrame = new rtc_node_1.AudioFrame(frame.data, frame.sampleRate, frame.channels, frame.data.length / frame.channels);
            source.captureFrame(lkFrame);
        }
        catch (err) {
            console.error("[EGRESS] Failed to capture frame:", err);
        }
    }
    isValid(frame) {
        if (frame.channels !== 1)
            return false;
        if (frame.sampleRate !== 16000 && frame.sampleRate !== 48000)
            return false;
        if (frame.data.length === 0)
            return false;
        return true;
    }
}
exports.AudioEgress = AudioEgress;
