import { AudioSource } from "@livekit/rtc-node";
export declare class OutputPipeline {
    private source;
    private tts;
    constructor(source: AudioSource);
    play(text: string): Promise<void>;
    pushFrame(data: Int16Array, sampleRate: number, channels: number): Promise<void>;
}
//# sourceMappingURL=output.pipeline.d.ts.map