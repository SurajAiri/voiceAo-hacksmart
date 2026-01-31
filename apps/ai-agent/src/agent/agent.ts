import { Room, RoomEvent, RemoteTrack, TrackKind, RemoteAudioTrack } from "@livekit/rtc-node";
import { ConversationPipeline } from "../pipeline/pipeline.js";

export class AIAgent {
  private room: Room;
  private pipeline: ConversationPipeline;
  private callId: string;
  private roomName: string;

  constructor(callId: string, roomName: string) {
    this.callId = callId;
    this.roomName = roomName;
    this.room = new Room();
    this.pipeline = new ConversationPipeline(callId, this.room);
  }

  async start(token: string) {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  AI Agent Starting for ${this.callId.substring(0, 12)}...  ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    // Setup track subscription handler BEFORE connecting
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      console.log(`[AGENT] Track subscribed: kind=${track.kind === TrackKind.KIND_AUDIO ? 'AUDIO' : 'VIDEO'}, sid=${track.sid}`);
      if (track.kind === TrackKind.KIND_AUDIO) {
        console.log(`[AGENT] 🎤 User audio track detected - attaching to pipeline...`);
        this.pipeline.attachInput(track as RemoteAudioTrack);
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log(`[AGENT] ❌ Disconnected from room ${this.roomName}`);
      this.pipeline.destroy();
    });

    // Connect to LiveKit
    try {
      console.log(`[AGENT] Connecting to LiveKit room: ${this.roomName}...`);
      await this.room.connect(process.env.LIVEKIT_URL!, token);
      console.log(`[AGENT] ✓ Connected to room ${this.roomName}`);
    } catch (err: any) {
      console.error(`[AGENT] ✗ Failed to connect:`, err.message);
      throw err;
    }

    // Start the conversation pipeline
    await this.pipeline.start();
    console.log(`[AGENT] ✓ Agent fully initialized and listening\n`);
  }

  async stop() {
    console.log(`[AGENT] Stopping agent for ${this.callId}...`);
    await this.room.disconnect();
  }
}
