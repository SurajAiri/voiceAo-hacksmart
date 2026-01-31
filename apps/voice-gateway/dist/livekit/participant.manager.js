"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticipantManager = void 0;
const call_events_1 = require("../events/call.events");
class ParticipantManager {
    constructor(roomManager) {
        this.roomManager = roomManager;
    }
    resolveRole(participant) {
        if (participant.metadata) {
            try {
                const meta = JSON.parse(participant.metadata);
                if (meta.role === "driver")
                    return "driver";
                if (meta.role === "bot")
                    return "bot";
            }
            catch {
            }
        }
        if (participant.identity.startsWith("bot_"))
            return "bot";
        if (participant.identity.startsWith("driver_"))
            return "driver";
        return "human";
    }
    async onParticipantConnected(callId, participant) {
        const role = this.resolveRole(participant);
        call_events_1.callEvents.emit("PARTICIPANT_JOINED", {
            callId,
            role,
            participantId: participant.identity,
        });
        if (role === "driver") {
            call_events_1.callEvents.emit("CALL_STARTED", { callId });
        }
    }
    async onParticipantDisconnected(callId, participant) {
        const role = this.resolveRole(participant);
        call_events_1.callEvents.emit("PARTICIPANT_LEFT", {
            callId,
            role,
            participantId: participant.identity,
        });
        if (role === "driver") {
            call_events_1.callEvents.emit("CALL_ENDED", { callId });
            await this.roomManager.closeRoom(callId);
        }
    }
}
exports.ParticipantManager = ParticipantManager;
