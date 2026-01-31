type CallEventType =
  | "CALL_CREATED"
  | "CALL_STARTED"
  | "CALL_ENDED"
  | "CALL_FAILED"

type CallEventPayload = {
  callId: string
  [key: string]: any
}

class CallEventEmitter {
  private emitted = new Set<string>()

  emit(type: CallEventType, payload: CallEventPayload) {
    const key = `${payload.callId}:${type}`

    if (this.emitted.has(key)) {
      return // idempotent
    }

    this.emitted.add(key)

    const event = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    }

    // 🔹 replace later with real orchestrator
    console.log("[CALL_EVENT]", JSON.stringify(event))
  }
}

export const callEvents = new CallEventEmitter()
