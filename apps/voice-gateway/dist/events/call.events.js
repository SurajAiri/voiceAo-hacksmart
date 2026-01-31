"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callEvents = void 0;
class CallEventEmitter {
    constructor() {
        this.emitted = new Set();
    }
    emit(type, payload) {
        const key = `${payload.callId}:${type}`;
        if (this.emitted.has(key)) {
            return; // idempotent
        }
        this.emitted.add(key);
        const event = {
            type,
            payload,
            timestamp: new Date().toISOString(),
        };
        // 🔹 replace later with real orchestrator
        console.log("[CALL_EVENT]", JSON.stringify(event));
    }
}
exports.callEvents = new CallEventEmitter();
