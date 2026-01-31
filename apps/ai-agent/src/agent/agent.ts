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
    console.log(`[AGENT] Starting connection to room ${this.roomName}...`);

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      console.log(`[AGENT] Track subscribed: ${track.sid}, kind: ${track.kind}`);
      if (track.kind === TrackKind.KIND_AUDIO) {
        console.log(`[AGENT] Subscribing to audio track ${track.sid} for call ${this.callId}`);
        this.pipeline.attachInput(track as RemoteAudioTrack);
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log(`[AGENT] Disconnected from room ${this.roomName}`);
      this.pipeline.destroy();
    });

    try {
      await this.room.connect(process.env.LIVEKIT_URL!, token);
      console.log(`[AGENT] Successfully connected to room ${this.roomName}`);
    } catch (err: any) {
      console.error(`[AGENT] Failed to connect to room ${this.roomName}:`, err.message);
      throw err;
    }

    // Join the pipeline
    console.log(`[AGENT] Starting conversation pipeline for ${this.callId}...`);
    await this.pipeline.start();
    console.log(`[AGENT] Conversation pipeline started for ${this.callId}`);
  }

  async stop() {
    console.log(`[AGENT] Stopping agent for ${this.callId}...`);
    await this.room.disconnect();
  }
}
