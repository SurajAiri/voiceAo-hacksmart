import { EventEmitter } from "events";
export declare class DeepgramService extends EventEmitter {
    private client;
    private keepAliveInterval;
    private connection;
    private isConnected;
    constructor();
    /**
     * Initialize streaming STT connection
     */
    startStream(): Promise<void>;
    /**
     * Send audio data for transcription
     */
    sendAudio(data: Int16Array): void;
    /**
     * Generate TTS audio
     */
    generateSpeech(text: string): Promise<Buffer | null>;
    private streamToBuffer;
    stop(): Promise<void>;
    private cleanup;
}
export declare const deepgramService: DeepgramService;
//# sourceMappingURL=deepgram.service.d.ts.map