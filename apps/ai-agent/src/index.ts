import "dotenv/config";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { AccessToken } from "livekit-server-sdk";
import { AIAgent } from "./agent/agent.js";

const app = express();
app.use(bodyParser.json());

const activeAgents = new Map<string, AIAgent>();

/**
 * POST /agent/start
 * Starts an AI agent for a specific room.
 * Called by the Orchestrator or a manual trigger.
 */
app.post("/agent/start", async (req: Request, res: Response) => {
  let { callId, roomName, token } = req.body;

  if (!callId || !roomName) {
    return res.status(400).json({ error: "Missing callId or roomName" });
  }

  // If no token provided or placeholder, generate one (Autonomous Mode)
  if (!token || token === "MOCK_TOKEN_NEEDS_GENERATION") {
    console.log(`[HTTP] No token provided for ${callId}, generating one...`);
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: `agent_${callId}`,
        name: "AI Agent",
      }
    );
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });
    token = await at.toJwt();
  }

  if (activeAgents.has(callId)) {
    console.log(`[HTTP] Agent already active for call ${callId}`);
    return res.status(200).json({ status: "already_running" });
  }

  const agent = new AIAgent(callId, roomName);
  activeAgents.set(callId, agent);

  try {
    console.log(`[HTTP] Starting agent for call ${callId}...`);
    await agent.start(token);
    res.status(200).json({ status: "started" });
  } catch (err: any) {
    console.error(`[HTTP] Failed to start agent for call ${callId}:`, err.message);
    activeAgents.delete(callId);
    res.status(500).json({ error: "Failed to start agent" });
  }
});

/**
 * POST /agent/stop
 * Gracefully stops an agent.
 */
app.post("/agent/stop", async (req: Request, res: Response) => {
  const { callId } = req.body;

  if (!callId) {
    return res.status(400).json({ error: "Missing callId" });
  }

  const agent = activeAgents.get(callId);
  if (agent) {
    await agent.stop();
    activeAgents.delete(callId);
    res.status(200).json({ status: "stopped" });
  } else {
    res.status(404).json({ error: "Agent not found" });
  }
});

const PORT = process.env.AGENT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 AI Agent service listening on :${PORT}`);
  console.log(`   Internal LiveKit URL: ${process.env.LIVEKIT_URL}`);
});
