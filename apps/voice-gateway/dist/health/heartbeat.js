"use strict";
// src/health/heartbeat.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHeartbeat = startHeartbeat;
exports.stopHeartbeat = stopHeartbeat;
let interval = null;
function startHeartbeat() {
    if (interval)
        return;
    interval = setInterval(() => {
        console.log(`[HEALTH] Voice Gateway alive @ ${new Date().toISOString()}`);
    }, 10000);
}
function stopHeartbeat() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
