"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
// src/livekit/room.manager.ts
const call_events_1 = require("../events/call.events");
const handoff_events_1 = require("../events/handoff.events");
const livekit_server_sdk_1 = require("livekit-server-sdk");
class RoomManager {
    constructor(livekitUrl, apiKey, apiSecret) {
        this.client = new livekit_server_sdk_1.RoomServiceClient(livekitUrl, apiKey, apiSecret);
    }
    roomName(callId) {
        return `call_${callId}`;
    }
    async createOrGetRoom(callId) {
        const name = this.roomName(callId);
        const rooms = await this.client.listRooms();
        const existing = rooms.find(r => r.name === name);
        if (existing) {
            return existing;
        }
        const room = await this.client.createRoom({
            name,
            metadata: JSON.stringify({ callId }),
            maxParticipants: 3,
        });
        call_events_1.callEvents.emit("CALL_CREATED", { callId });
        handoff_events_1.handoffEvents.emit("ROOM_CREATED", callId);
        return room;
    }
    async closeRoom(callId) {
        const name = this.roomName(callId);
        try {
            const participants = await this.client.listParticipants(name);
            for (const p of participants) {
                await this.client.removeParticipant(name, p.identity);
            }
            await this.client.deleteRoom(name);
            call_events_1.callEvents.emit("CALL_ENDED", { callId });
            handoff_events_1.handoffEvents.emit("ROOM_CLOSED", callId);
        }
        catch {
            // safe close
        }
    }
}
exports.RoomManager = RoomManager;
