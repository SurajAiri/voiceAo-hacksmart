import { AudioFrame as LiveKitAudioFrame } from "@livekit/rtc-node";
import { DeepgramService } from "../services/deepgram.service.js";
export class OutputPipeline {
    source;
    tts;
    constructor(source) {
        this.source = source;
        this.tts = new DeepgramService();
    }
    async play(text) {
        console.log(`[OUTPUT] Speaking: "${text}"`);
        // Generate TTS via Deepgram
        const buffer = await this.tts.generateSpeech(text);
        if (buffer) {
            // Convert Buffer (Int16, 16kHz) to Int16Array frames
            // The buffer is raw PCM linear16 (requested in service)
            const pcmData = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
            const sampleRate = 16000;
            const frameSize = 320; // 20ms at 16k
            for (let i = 0; i < pcmData.length; i += frameSize) {
                const chunk = pcmData.slice(i, i + frameSize);
                if (chunk.length < frameSize)
                    break; // Drop partial end frame
                await this.pushFrame(chunk, sampleRate, 1);
                // Realtime pacing
                await new Promise(r => setTimeout(r, 20));
            }
        }
    }
    async pushFrame(data, sampleRate, channels) {
        const frame = new LiveKitAudioFrame(data, sampleRate, channels, data.length / channels);
        this.source.captureFrame(frame);
    }
}
//# sourceMappingURL=output.pipeline.js.map