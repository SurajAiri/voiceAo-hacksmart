import { AudioSource, AudioFrame as LiveKitAudioFrame } from "@livekit/rtc-node";

import { DeepgramService } from "../services/deepgram.service.js";

export class OutputPipeline {
  private tts: DeepgramService;

  constructor(private source: AudioSource) {
      this.tts = new DeepgramService();
  }

  async play(text: string) {
    const startTime = Date.now();
    
    // Generate TTS via Deepgram
    const buffer = await this.tts.generateSpeech(text);
    const ttsTime = Date.now() - startTime;
    
    if (buffer) {
        console.log(`[TTS] Generated ${buffer.length} bytes in ${ttsTime}ms`);
        
        // Convert Buffer (Int16, 16kHz) to Int16Array frames
        const pcmData = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
        
        const sampleRate = 16000;
        const frameSize = 320; // 20ms at 16k
        let frameCount = 0;
        
        for (let i = 0; i < pcmData.length; i += frameSize) {
            const chunk = pcmData.slice(i, i + frameSize);
            if (chunk.length < frameSize) break;
            
            await this.pushFrame(chunk, sampleRate, 1);
            frameCount++;
            await new Promise(r => setTimeout(r, 20)); // Realtime pacing
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`[TTS] Played ${frameCount} frames in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    } else {
        console.error(`[TTS] ✗ Failed to generate speech for: "${text.substring(0, 30)}..."`);
    }
  }

  async pushFrame(data: Int16Array, sampleRate: number, channels: number) {
    const frame = new LiveKitAudioFrame(
      data,
      sampleRate,
      channels,
      data.length / channels
    );
    this.source.captureFrame(frame);
  }
}
