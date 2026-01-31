
import { callEvents } from "../events/call.events"
import { RoomManager } from "./room.manager"

export type ParticipantRole = "driver" | "human" | "bot"

type LiveKitParticipant = {
  identity: string
  metadata?: string
}

export class ParticipantManager {
  constructor(private roomManager: RoomManager) {}

  resolveRole(participant: LiveKitParticipant): ParticipantRole {
    if (participant.metadata) {
      try {
        const meta = JSON.parse(participant.metadata)
        if (meta.role === "driver") return "driver"
        if (meta.role === "bot") return "bot"
      } catch {

      }
    }

    if (participant.identity.startsWith("bot_")) return "bot"
    if (participant.identity.startsWith("driver_")) return "driver"

    return "human"
  }


  async onParticipantConnected(
    callId: string,
    participant: LiveKitParticipant
  ) {
    const role = this.resolveRole(participant)

    callEvents.emit("PARTICIPANT_JOINED" as any, {
      callId,
      role,
      participantId: participant.identity,
    })

    if (role === "driver") {
      callEvents.emit("CALL_STARTED", { callId })
    }
  }

  async onParticipantDisconnected(
    callId: string,
    participant: LiveKitParticipant
  ) {
    const role = this.resolveRole(participant)

    callEvents.emit("PARTICIPANT_LEFT" as any, {
      callId,
      role,
      participantId: participant.identity,
    })

    if (role === "driver") {
      callEvents.emit("CALL_ENDED", { callId })
      await this.roomManager.closeRoom(callId)
    }
  }
}
