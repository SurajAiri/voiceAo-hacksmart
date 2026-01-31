"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audio_ingress_1 = require("./audio.ingress");
const ingress = new audio_ingress_1.AudioIngress();
// silent frame (should be ignored)
ingress.onAudioFrame({
    data: new Int16Array([0, 0, 0, 0]),
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now(),
    duration: 20
});
// non-silent frame (should log)
ingress.onAudioFrame({
    data: new Int16Array([12, -8, 4]),
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now(),
    duration: 20
});
