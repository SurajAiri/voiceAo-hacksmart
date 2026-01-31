import { AudioStream } from "@livekit/rtc-node";
export declare class InputPipeline {
    private silenceDetector;
    private hasSpeech;
    constructor();
    monitor(stream: AudioStream): AsyncGenerator<Int16Array[]>;
}
//# sourceMappingURL=input.pipeline.d.ts.map