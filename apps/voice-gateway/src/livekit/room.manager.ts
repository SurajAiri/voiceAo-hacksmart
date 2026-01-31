// src/livekit/room.manager.ts
import { callEvents } from "../events/call.events"
import { handoffEvents } from "../events/handoff.events"

import { RoomServiceClient } from "livekit-server-sdk"

export class RoomManager {
  private client: RoomServiceClient

  constructor(livekitUrl: string, apiKey: string, apiSecret: string) {
    this.client = new RoomServiceClient(livekitUrl, apiKey, apiSecret)
  }

  private roomName(callId: string): string {
    return `call_${callId}`
  }

async createOrGetRoom(callId: string) {
  const name = this.roomName(callId)

  const rooms = await this.client.listRooms()
  const existing = rooms.find(r => r.name === name)

  if (existing) {
    return existing
  }

  const room = await this.client.createRoom({
    name,
    metadata: JSON.stringify({ callId }),
    maxParticipants: 3,
  })

  callEvents.emit("CALL_CREATED", { callId })
  handoffEvents.emit("ROOM_CREATED", callId)

  return room
}


  async closeRoom(callId: string) {
  const name = this.roomName(callId)

  try {
    const participants = await this.client.listParticipants(name)

    for (const p of participants) {
      await this.client.removeParticipant(name, p.identity)
    }

    await this.client.deleteRoom(name)

    callEvents.emit("CALL_ENDED", { callId })
    handoffEvents.emit("ROOM_CLOSED", callId)
  } catch {
    // safe close
  }
}

}
