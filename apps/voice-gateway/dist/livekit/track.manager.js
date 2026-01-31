"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackManager = void 0;
class TrackManager {
    constructor() {
        this.activeTracks = new Map();
    }
    onTrackPublished(track, participant, role) {
        // 1️⃣ Only audio
        if (track.kind !== "audio") {
            return;
        }
        // 2️⃣ Never subscribe to bot audio
        if (role === "bot") {
            return;
        }
        // 3️⃣ Idempotent attach
        if (this.activeTracks.has(track.sid)) {
            return;
        }
        this.activeTracks.set(track.sid, track);
        console.log("[TRACK] Audio track attached", {
            trackSid: track.sid,
            participant: participant.identity,
            role,
        });
    }
    onTrackUnpublished(trackSid) {
        if (!this.activeTracks.has(trackSid)) {
            return;
        }
        this.activeTracks.delete(trackSid);
        console.log("[TRACK] Audio track detached", {
            trackSid,
        });
    }
}
exports.TrackManager = TrackManager;
