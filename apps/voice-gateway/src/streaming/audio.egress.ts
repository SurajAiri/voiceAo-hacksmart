import { AudioFrame } from "@voice-platform/audio"
import { AudioSource, AudioFrame as LiveKitAudioFrame } from "@livekit/rtc-node"

export class AudioEgress {
  private activeSources = new Map<string, AudioSource>()

  addActiveSource(callId: string, source: AudioSource) {
    this.activeSources.set(callId, source)
    console.log(`[EGRESS] Added active source for call ${callId}`)
  }

  removeActiveSource(callId: string) {
    this.activeSources.delete(callId)
    console.log(`[EGRESS] Removed active source for call ${callId}`)
  }

  publishAudio(callId: string, frame: AudioFrame) {
    const source = this.activeSources.get(callId)
    if (!source) return

    try {
      if (!this.isValid(frame)) return

      const lkFrame = new LiveKitAudioFrame(
        frame.data,
        frame.sampleRate,
        frame.channels,
        frame.data.length / frame.channels
      )

      source.captureFrame(lkFrame)
    } catch (err) {
      console.error("[EGRESS] Failed to capture frame:", err)
    }
  }

  private isValid(frame: AudioFrame): boolean {
    if (frame.channels !== 1) return false
    if (frame.sampleRate !== 16000 && frame.sampleRate !== 48000) return false
    if (frame.data.length === 0) return false
    return true
  }
}
