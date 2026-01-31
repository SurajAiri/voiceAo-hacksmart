import { SilenceDetector } from "@voice-platform/audio";
export class InputPipeline {
    silenceDetector;
    hasSpeech = false;
    constructor() {
        this.silenceDetector = new SilenceDetector({
            thresholdDb: -40,
            minSilenceDurationMs: 1000,
        });
    }
    async *monitor(stream) {
        let buffer = [];
        for await (const frame of stream) {
            const duration = (frame.samplesPerChannel / frame.sampleRate) * 1000;
            const state = this.silenceDetector.process(frame.data, duration);
            if (state === 'speech_started') {
                this.hasSpeech = true;
                buffer = [];
                console.log(`[INPUT] User speech started`);
            }
            if (this.hasSpeech) {
                buffer.push(new Int16Array(frame.data));
            }
            if (state === 'silence_started' && this.hasSpeech) {
                this.hasSpeech = false;
                console.log(`[INPUT] User speech finished (${buffer.length} frames)`);
                yield buffer;
                buffer = [];
            }
        }
    }
}
//# sourceMappingURL=input.pipeline.js.map