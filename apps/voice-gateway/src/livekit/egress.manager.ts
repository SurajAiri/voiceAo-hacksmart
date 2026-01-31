// src/livekit/egress.manager.ts

import {
  EgressClient,
  EncodedFileType,
  EncodedOutputs,
  EgressInfo,
  EncodedFileOutput,
} from "livekit-server-sdk"

export class EgressManager {
  private client: EgressClient
  private active = new Map<string, string>() // callId → egressId

  constructor(livekitUrl: string, apiKey: string, apiSecret: string) {
    this.client = new EgressClient(livekitUrl, apiKey, apiSecret)
  }

  async startRecording(callId: string, roomName: string) {
    if (this.active.has(callId)) {
      return
    }

    try {
      const output: EncodedOutputs = {
        file: new EncodedFileOutput({
          filepath: `recordings/${callId}.mp4`,
          fileType: EncodedFileType.MP4,
        }),
      }

      const result = await this.client.startRoomCompositeEgress(
        roomName,
        output,
        {
          layout: "speaker",
        }
      )

      this.active.set(callId, result.egressId)

      console.log("[EGRESS] Recording started", {
        callId,
        egressId: result.egressId,
      })
    } catch (err) {
      console.error("[EGRESS] Failed to start recording", err)
    }
  }

  async stopRecording(callId: string) {
    const egressId = this.active.get(callId)
    if (!egressId) return

    try {
      await this.client.stopEgress(egressId)
      console.log("[EGRESS] Recording stopped", { callId })
    } catch (err) {
      console.warn("[EGRESS] Failed to stop recording", err)
    } finally {
      this.active.delete(callId)
    }
  }
}
