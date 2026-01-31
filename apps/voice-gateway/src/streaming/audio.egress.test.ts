import { AudioEgress } from "./audio.egress"

const egress = new AudioEgress()

egress.publishAudio('test-call', {
  data: new Int16Array([1, -2, 3, -4]),
  sampleRate: 16000,
  channels: 1,
  timestamp: Date.now(),
  duration: 20
})
