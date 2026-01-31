import { createClient, DeepgramClient, ListenLiveClient } from "@deepgram/sdk";
import { EventEmitter } from "events";

export class DeepgramService extends EventEmitter {
  private client: DeepgramClient;
  private connection: ListenLiveClient | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private audioBytesSent = 0;
  private lastAudioLogTime = 0;

  constructor() {
    super();
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error("[DEEPGRAM] ✗ DEEPGRAM_API_KEY not set - STT will not work!");
    } else {
      console.log(`[DEEPGRAM] API key configured (${apiKey.substring(0, 8)}...)`);
    }
    this.client = createClient(apiKey || "");
  }

  /**
   * Initialize streaming STT connection
   */
  async startStream(): Promise<void> {
    if (this.isConnected) {
      console.log("[DEEPGRAM] Already connected, skipping...");
      return;
    }

    console.log("[DEEPGRAM] Starting live transcription connection...");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("[DEEPGRAM] ✗ Connection timeout after 10 seconds");
        reject(new Error("Deepgram connection timeout"));
      }, 10000);

      try {
        // Create the live transcription connection
        this.connection = this.client.listen.live({
          model: "nova-2",
          language: "en",
          smart_format: true,
          encoding: "linear16",
          sample_rate: 16000,
          channels: 1,
          interim_results: false, // Only final results
          utterance_end_ms: 1000,
          vad_events: true,
        });

        // Event: Connection opened
        this.connection.on("open", () => {
          clearTimeout(timeout);
          console.log("[DEEPGRAM] ✓ Live connection OPEN");
          this.isConnected = true;
          
          // Keep connection alive
          this.keepAliveInterval = setInterval(() => {
            if (this.isConnected && this.connection) {
              this.connection.keepAlive();
            }
          }, 5000);
          
          resolve();
        });

        // Event: Transcription results
        this.connection.on("transcript", (data: any) => {
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;
          
          if (transcript && transcript.trim().length > 0 && isFinal) {
            console.log(`[DEEPGRAM] 📝 Transcript: "${transcript}"`);
            this.emit("transcription", transcript);
          }
        });

        // Event: Speech started (VAD)
        this.connection.on("speech_started", () => {
          console.log("[DEEPGRAM] 🎙 Speech started");
          this.emit("speech_started");
        });

        // Event: Utterance ended
        this.connection.on("utterance_end", () => {
          console.log("[DEEPGRAM] 🔇 Utterance ended");
          this.emit("utterance_end");
        });

        // Event: Metadata
        this.connection.on("metadata", (data: any) => {
          console.log("[DEEPGRAM] Metadata received:", data.request_id);
        });

        // Event: Error
        this.connection.on("error", (err: any) => {
          clearTimeout(timeout);
          console.error("[DEEPGRAM] ✗ Error:", err);
          this.isConnected = false;
          reject(err);
        });

        // Event: Connection closed
        this.connection.on("close", () => {
          console.log("[DEEPGRAM] Connection closed");
          this.cleanup();
        });

        // Event: Warning
        this.connection.on("warning", (warning: any) => {
          console.warn("[DEEPGRAM] ⚠ Warning:", warning);
        });

      } catch (error) {
        clearTimeout(timeout);
        console.error("[DEEPGRAM] ✗ Failed to create connection:", error);
        reject(error);
      }
    });
  }

  /**
   * Send audio data for transcription
   */
  sendAudio(data: Int16Array) {
    if (this.isConnected && this.connection) {
      // Deepgram expects ArrayBuffer - slice to get a new ArrayBuffer from the view
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      this.connection.send(arrayBuffer);
      this.audioBytesSent += arrayBuffer.byteLength;
    } else {
      // Only log warning once per second
      const now = Date.now();
      if (now - this.lastAudioLogTime > 1000) {
        console.warn(`[DEEPGRAM] ⚠ Audio dropped - isConnected=${this.isConnected}, hasConnection=${!!this.connection}`);
        this.lastAudioLogTime = now;
      }
    }
  }

  /**
   * Generate TTS audio
   */
  async generateSpeech(text: string): Promise<Buffer | null> {
    try {
      console.log(`[TTS] Generating speech for: "${text.substring(0, 30)}..."`);
      const response = await this.client.speak.request(
        { text },
        {
          model: "aura-asteria-en",
          encoding: "linear16",
          sample_rate: 16000,
        }
      );

      const stream = await response.getStream();
      if (stream) {
        const buffer = await this.streamToBuffer(stream);
        return buffer;
      }
      console.warn("[TTS] No stream returned");
      return null;
    } catch (error) {
      console.error("[TTS] ✗ Failed:", error);
      return null;
    }
  }

  private async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  stop() {
    this.cleanup();
  }

  private cleanup() {
    this.isConnected = false;
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.connection) {
      try {
        this.connection.finish();
      } catch (e) {
        // Ignore close errors
      }
      this.connection = null;
    }
  }
}

export const deepgramService = new DeepgramService();
