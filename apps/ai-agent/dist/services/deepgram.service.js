import { createClient } from "@deepgram/sdk";
import { EventEmitter } from "events";
export class DeepgramService extends EventEmitter {
    client;
    keepAliveInterval = null;
    connection = null; // Type as 'any' for now to avoid SDK version conflicts in strict mode
    isConnected = false;
    constructor() {
        super();
        this.client = createClient(process.env.DEEPGRAM_API_KEY || "dummy_key");
    }
    /**
     * Initialize streaming STT connection
     */
    async startStream() {
        if (this.isConnected)
            return;
        try {
            this.connection = this.client.listen.live({
                model: "nova-2",
                language: "en",
                smart_format: true,
                encoding: "linear16",
                sample_rate: 16000,
                channels: 1,
                interim_results: true,
                utterance_end_ms: 1000,
                vad_events: true,
            });
            this.connection.on("Open", () => {
                console.log("[DEEPGRAM] Connection open");
                this.isConnected = true;
                // Keep alive logic
                this.keepAliveInterval = setInterval(() => {
                    if (this.isConnected && this.connection) {
                        this.connection.keepAlive();
                    }
                }, 3000);
            });
            this.connection.on("Results", (data) => {
                // console.log("[DEEPGRAM] Raw result:", JSON.stringify(data));
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                if (transcript && data.is_final) {
                    console.log(`[DEEPGRAM] Transcript found: "${transcript}"`);
                    this.emit("transcription", transcript);
                }
            });
            this.connection.on("UtteranceEnd", () => {
                this.emit("utterance_end");
            });
            this.connection.on("metadata", (data) => {
                // console.log("[DEEPGRAM] Metadata:", data);
            });
            this.connection.on("error", (err) => {
                console.error("[DEEPGRAM] Error:", JSON.stringify(err, null, 2));
            });
            this.connection.on("Close", () => {
                console.log("[DEEPGRAM] Connection closed");
                this.cleanup();
            });
        }
        catch (error) {
            console.error("[DEEPGRAM] Failed to start stream:", error);
        }
    }
    /**
     * Send audio data for transcription
     */
    sendAudio(data) {
        if (this.isConnected && this.connection) {
            // Deepgram expects raw buffer
            // Vital: Use byteOffset and byteLength, as data.buffer might be a larger shared buffer
            const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
            // console.log(`[DEEPGRAM] Sending ${buffer.length} bytes`);
            this.connection.send(buffer);
        }
        else {
            if (!this.isConnected)
                console.warn("[DEEPGRAM] Cannot send audio: Not connected");
            if (!this.connection)
                console.warn("[DEEPGRAM] Cannot send audio: No connection object");
        }
    }
    /**
     * Generate TTS audio
     */
    async generateSpeech(text) {
        try {
            const response = await this.client.speak.request({ text }, {
                model: "aura-asteria-en",
                encoding: "linear16",
                sample_rate: 16000,
            });
            const stream = await response.getStream();
            if (stream) {
                const buffer = await this.streamToBuffer(stream);
                return buffer;
            }
            console.warn("[DEEPGRAM] No stream returned from TTS");
            return null;
        }
        catch (error) {
            console.error("[DEEPGRAM] TTS failed:", error);
            return null;
        }
    }
    async streamToBuffer(stream) {
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    }
    async stop() {
        this.cleanup();
    }
    cleanup() {
        this.isConnected = false;
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        if (this.connection) {
            // this.connection.finish(); // Check newer SDK methods
            this.connection = null;
        }
    }
}
export const deepgramService = new DeepgramService();
//# sourceMappingURL=deepgram.service.js.map