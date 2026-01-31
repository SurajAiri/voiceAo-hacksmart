"use strict";
// src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("./config/env");
const room_manager_1 = require("./livekit/room.manager");
const participant_manager_1 = require("./livekit/participant.manager");
const track_manager_1 = require("./livekit/track.manager");
const stream_manager_1 = require("./livekit/stream.manager");
// --------------------
// Process state
// --------------------
let shuttingDown = false;
// --------------------
// Bootstrap
// --------------------
async function boot() {
    try {
        console.log("[BOOT] Starting Voice Gateway");
        // 1️⃣ Load environment
        const env = (0, env_1.loadEnv)();
        // 2️⃣ Create managers
        const roomManager = new room_manager_1.RoomManager(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
        const participantManager = new participant_manager_1.ParticipantManager(roomManager);
        const trackManager = new track_manager_1.TrackManager();
        // Audio Data Plane Manager
        const streamManager = new stream_manager_1.StreamManager(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
        // 3️⃣ Setup webhook server
        const app = (0, express_1.default)();
        // IMPORTANT: must be raw for signature verification
        app.use(body_parser_1.default.raw({ type: "application/webhook+json" }));
        const receiver = new livekit_server_sdk_1.WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
        app.post("/livekit/webhook", async (req, res) => {
            try {
                const event = await receiver.receive(req.body, req.headers["authorization"]);
                console.log("[WEBHOOK] Event received:", event.event);
                // Handle Test Event from Dashboard
                if (event.event === "test") {
                    console.log("[WEBHOOK] Dashboard test event verified successfully");
                    return res.status(200).send("ok");
                }
                const callId = event.room?.metadata
                    ? JSON.parse(event.room.metadata).callId
                    : undefined;
                if (!callId) {
                    console.warn(`[WEBHOOK] Ignored: Room ${event.room?.name} missing callId metadata`);
                    return res.status(200).send("ignored");
                }
                // --------------------
                // Participant lifecycle
                // --------------------
                if (event.event === "participant_joined" && event.participant) {
                    const role = participantManager.resolveRole(event.participant);
                    await participantManager.onParticipantConnected(callId, {
                        identity: event.participant.identity,
                        metadata: event.participant.metadata,
                    });
                    if (role === "driver") {
                        await streamManager.joinRoom(callId);
                        // 🚀 Notify Orchestrator that the call is starting/active
                        const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:3000";
                        axios_1.default.post(`${orchestratorUrl}/calls/${callId}/start`)
                            .then(() => console.log(`[GW↔ORCH] Call ${callId} start reported`))
                            .catch(err => console.error(`[GW↔ORCH] Failed to report call start:`, err.message));
                    }
                }
                if (event.event === "participant_left" && event.participant) {
                    const role = participantManager.resolveRole(event.participant);
                    await participantManager.onParticipantDisconnected(callId, {
                        identity: event.participant.identity,
                        metadata: event.participant.metadata,
                    });
                    if (role === "driver") {
                        await streamManager.leaveRoom(callId);
                    }
                }
                // --------------------
                // Track lifecycle (Management plane)
                // --------------------
                if (event.event === "track_published" && event.participant && event.track) {
                    const role = participantManager.resolveRole({
                        identity: event.participant.identity,
                        metadata: event.participant.metadata,
                    });
                    trackManager.onTrackPublished({
                        sid: event.track.sid,
                        kind: event.track.type === 0 ? "audio" : "video",
                    }, {
                        identity: event.participant.identity,
                        metadata: event.participant.metadata,
                    }, role);
                }
                if (event.event === "track_unpublished" && event.track) {
                    trackManager.onTrackUnpublished(event.track.sid);
                }
                res.status(200).send("ok");
            }
            catch (err) {
                console.error("[WEBHOOK] Invalid event or processing error", err);
                res.status(400).send("invalid");
            }
        });
        // 4️⃣ Start server
        const PORT = process.env.PORT || 3002;
        app.listen(PORT, () => {
            console.log(`[BOOT] Webhook server listening on :${PORT}`);
        });
        console.log("[BOOT] Voice Gateway ready");
    }
    catch (err) {
        console.error("[BOOT] Fatal startup error:", err);
        process.exit(1);
    }
}
// --------------------
// Shutdown
// --------------------
async function shutdown(signal) {
    if (shuttingDown)
        return;
    shuttingDown = true;
    console.log(`[SHUTDOWN] Received ${signal}`);
    process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", err => {
    console.error("[FATAL] Uncaught exception", err);
    shutdown("uncaughtException");
});
process.on("unhandledRejection", err => {
    console.error("[FATAL] Unhandled rejection", err);
    shutdown("unhandledRejection");
});
// --------------------
// Start
// --------------------
boot();
