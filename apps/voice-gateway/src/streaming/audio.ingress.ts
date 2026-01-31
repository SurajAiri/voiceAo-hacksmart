// src/streaming/audio.ingress.ts

import { AudioFrame } from "@voice-platform/audio"

export class AudioIngress {
  onAudioFrame(frame: AudioFrame) {
    // 1️⃣ Validate sample rate
    if (!this.isSupportedSampleRate(frame.sampleRate)) {
      return // drop silently
    }

    // 2️⃣ Silence detection
    if (this.isSilent(frame.data)) {
      return // forward later phases, but ignore now
    }

    // 3️⃣ Non-blocking observation
    this.observeFrame(frame)
  }

  private isSupportedSampleRate(rate: number): boolean {
    return rate === 16000 || rate === 48000
  }

  private isSilent(samples: Int16Array): boolean {
    let sum = 0
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i])
      if (sum > 0) return false
    }
    return true
  }

  private observeFrame(frame: AudioFrame) {
    // Phase 5: just observe
    // Phase 6+: forward to processing
    console.log("[AUDIO_IN]", {
      samples: frame.data.length,
      sampleRate: frame.sampleRate,
      channels: frame.channels,
    })
  }
}
