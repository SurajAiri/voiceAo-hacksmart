// src/index.ts

import "dotenv/config"
import express from "express"
import bodyParser from "body-parser"
import { WebhookReceiver } from "livekit-server-sdk"
import axios from "axios"

import { loadEnv } from "./config/env"
import { RoomManager } from "./livekit/room.manager"
import { ParticipantManager } from "./livekit/participant.manager"
import { TrackManager } from "./livekit/track.manager"
import { StreamManager } from "./livekit/stream.manager"

// --------------------
// Process state
// --------------------
let shuttingDown = false

// --------------------
// Bootstrap
// --------------------
async function boot() {
  try {
    console.log("[BOOT] Starting Voice Gateway")

    // 1️⃣ Load environment
    const env = loadEnv()

    // 2️⃣ Create managers
    const roomManager = new RoomManager(
      env.LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    )

    const participantManager = new ParticipantManager(roomManager)
    const trackManager = new TrackManager()
    
    // Audio Data Plane Manager
    const streamManager = new StreamManager(
      env.LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    )

    // 3️⃣ Setup webhook server
    const app = express()

    // IMPORTANT: must be raw for signature verification
    app.use(bodyParser.raw({ type: "application/webhook+json" }))

    const receiver = new WebhookReceiver(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    )

    app.post("/livekit/webhook", async (req, res) => {
      try {
        const event = await receiver.receive(
          req.body,
          req.headers["authorization"]
        )

        console.log("[WEBHOOK] Event received:", event.event)

        // Handle Test Event from Dashboard
        if (event.event === "test" as any) {
          console.log("[WEBHOOK] Dashboard test event verified successfully")
          return res.status(200).send("ok")
        }

        const callId = event.room?.metadata
          ? JSON.parse(event.room.metadata).callId
          : undefined

        if (!callId) {
          console.warn(`[WEBHOOK] Ignored: Room ${event.room?.name} missing callId metadata`)
          return res.status(200).send("ignored")
        }

        // --------------------
        // Participant lifecycle
        // --------------------
        if (event.event === "participant_joined" && event.participant) {
          const role = participantManager.resolveRole(event.participant)

          await participantManager.onParticipantConnected(callId, {
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })

          if (role === "driver") {
            await streamManager.joinRoom(callId)
            
            // 🚀 Notify Orchestrator that the call is starting/active
            const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:3000"
            axios.post(`${orchestratorUrl}/calls/${callId}/start`)
              .then(() => console.log(`[GW↔ORCH] Call ${callId} start reported`))
              .catch(err => console.error(`[GW↔ORCH] Failed to report call start:`, err.message))
          }
        }

        if (event.event === "participant_left" && event.participant) {
          const role = participantManager.resolveRole(event.participant)

          await participantManager.onParticipantDisconnected(callId, {
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })

          if (role === "driver") {
            await streamManager.leaveRoom(callId)
          }
        }

        // --------------------
        // Track lifecycle (Management plane)
        // --------------------
        if (event.event === "track_published" && event.participant && event.track) {
          const role = participantManager.resolveRole({
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })

          trackManager.onTrackPublished(
            {
              sid: event.track.sid,
              kind: event.track.type === 0 ? "audio" : "video",
            },
            {
              identity: event.participant.identity,
              metadata: event.participant.metadata,
            },
            role
          )
        }

        if (event.event === "track_unpublished" && event.track) {
          trackManager.onTrackUnpublished(event.track.sid)
        }

        res.status(200).send("ok")
      } catch (err) {
        console.error("[WEBHOOK] Invalid event or processing error", err)
        res.status(400).send("invalid")
      }
    })

    // 4️⃣ Start server
    const PORT = process.env.PORT || 3002
    app.listen(PORT, () => {
      console.log(`[BOOT] Webhook server listening on :${PORT}`)
    })

    console.log("[BOOT] Voice Gateway ready")
  } catch (err) {
    console.error("[BOOT] Fatal startup error:", err)
    process.exit(1)
  }
}

// --------------------
// Shutdown
// --------------------
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[SHUTDOWN] Received ${signal}`)
  process.exit(0)
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("uncaughtException", err => {
  console.error("[FATAL] Uncaught exception", err)
  shutdown("uncaughtException")
})
process.on("unhandledRejection", err => {
  console.error("[FATAL] Unhandled rejection", err)
  shutdown("unhandledRejection")
})

// --------------------
// Start
// --------------------
boot()
