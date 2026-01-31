"use strict";
// src/livekit/egress.manager.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.EgressManager = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
class EgressManager {
    constructor(livekitUrl, apiKey, apiSecret) {
        this.active = new Map(); // callId → egressId
        this.client = new livekit_server_sdk_1.EgressClient(livekitUrl, apiKey, apiSecret);
    }
    async startRecording(callId, roomName) {
        if (this.active.has(callId)) {
            return;
        }
        try {
            const output = {
                file: new livekit_server_sdk_1.EncodedFileOutput({
                    filepath: `recordings/${callId}.mp4`,
                    fileType: livekit_server_sdk_1.EncodedFileType.MP4,
                }),
            };
            const result = await this.client.startRoomCompositeEgress(roomName, output, {
                layout: "speaker",
            });
            this.active.set(callId, result.egressId);
            console.log("[EGRESS] Recording started", {
                callId,
                egressId: result.egressId,
            });
        }
        catch (err) {
            console.error("[EGRESS] Failed to start recording", err);
        }
    }
    async stopRecording(callId) {
        const egressId = this.active.get(callId);
        if (!egressId)
            return;
        try {
            await this.client.stopEgress(egressId);
            console.log("[EGRESS] Recording stopped", { callId });
        }
        catch (err) {
            console.warn("[EGRESS] Failed to stop recording", err);
        }
        finally {
            this.active.delete(callId);
        }
    }
}
exports.EgressManager = EgressManager;
