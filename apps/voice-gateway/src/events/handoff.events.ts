type HandoffEventType =
  | "ROOM_CREATED"
  | "ROOM_CLOSED"
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"

class HandoffEventEmitter {
  private emitted = new Set<string>()

  emit(type: HandoffEventType, callId: string) {
    const key = `${callId}:${type}`

    if (this.emitted.has(key)) {
      return
    }

    this.emitted.add(key)

    const event = {
      type,
      callId,
      timestamp: new Date().toISOString(),
    }

    console.log("[HANDOFF_EVENT]", JSON.stringify(event))
  }
}

export const handoffEvents = new HandoffEventEmitter()
