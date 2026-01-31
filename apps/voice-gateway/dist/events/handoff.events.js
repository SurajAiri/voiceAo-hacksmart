"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handoffEvents = void 0;
class HandoffEventEmitter {
    constructor() {
        this.emitted = new Set();
    }
    emit(type, callId) {
        const key = `${callId}:${type}`;
        if (this.emitted.has(key)) {
            return;
        }
        this.emitted.add(key);
        const event = {
            type,
            callId,
            timestamp: new Date().toISOString(),
        };
        console.log("[HANDOFF_EVENT]", JSON.stringify(event));
    }
}
exports.handoffEvents = new HandoffEventEmitter();
