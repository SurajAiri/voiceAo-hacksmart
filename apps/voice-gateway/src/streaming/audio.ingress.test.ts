import { AudioIngress } from "./audio.ingress"

const ingress = new AudioIngress()

// silent frame (should be ignored)
ingress.onAudioFrame({
  data: new Int16Array([0, 0, 0, 0]),
  sampleRate: 16000,
  channels: 1,
  timestamp: Date.now(),
  duration: 20
})

// non-silent frame (should log)
ingress.onAudioFrame({
  data: new Int16Array([12, -8, 4]),
  sampleRate: 16000,
  channels: 1,
  timestamp: Date.now(),
  duration: 20
})
