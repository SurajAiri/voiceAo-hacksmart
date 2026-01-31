"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audio_egress_1 = require("./audio.egress");
const egress = new audio_egress_1.AudioEgress();
egress.publishAudio('test-call', {
    data: new Int16Array([1, -2, 3, -4]),
    sampleRate: 16000,
    channels: 1,
    timestamp: Date.now(),
    duration: 20
});
