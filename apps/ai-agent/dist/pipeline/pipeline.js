import { AudioStream, AudioSource, LocalAudioTrack, TrackSource, TrackPublishOptions, } from "@livekit/rtc-node";
import axios from "axios";
import { InputPipeline } from "./input.pipeline.js";
import { NLPPipeline } from "./nlp.pipeline.js";
import { ReasoningPipeline } from "./reasoning.pipeline.js";
import { OutputPipeline } from "./output.pipeline.js";
import { DeepgramService } from "../services/deepgram.service.js";
export class ConversationPipeline {
    callId;
    room;
    input;
    nlp;
    reasoning;
    output;
    outputSource;
    processing = false;
    orchestratorUrl;
    // New STT Service
    stt;
    constructor(callId, room) {
        this.callId = callId;
        this.room = room;
        this.outputSource = new AudioSource(16000, 1);
        this.input = new InputPipeline();
        this.nlp = new NLPPipeline();
        this.reasoning = new ReasoningPipeline();
        this.output = new OutputPipeline(this.outputSource);
        this.stt = new DeepgramService();
        this.orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:3000";
    }
    async start() {
        const localTrack = LocalAudioTrack.createAudioTrack("agent-voice", this.outputSource);
        const options = new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE });
        if (this.room.localParticipant) {
            await this.room.localParticipant.publishTrack(localTrack, options);
            console.log(`[PIPELINE] Agent voice track published for ${this.callId}`);
        }
        // Connect STT
        await this.stt.startStream();
        this.stt.on('transcription', async (text) => {
            console.log(`[PIPELINE] STT Transcript: "${text}"`);
            if (text.trim().length > 0) {
                await this.handleUserPhrase(text);
            }
        });
        // Initial greeting
        await this.processTurn("Hello, I am your AI support assistant. How can I help you today?");
    }
    attachInput(track) {
        const stream = new AudioStream(track);
        this.runLoop(stream).catch(err => console.error("[PIPELINE] Loop error:", err));
    }
    async runLoop(stream) {
        if (this.processing) {
            console.log(`[PIPELINE] Loop already running for ${this.callId}`);
            return;
        }
        this.processing = true;
        console.log(`[PIPELINE] Entering runLoop for ${this.callId}`);
        try {
            // Just stream audio to Deepgram
            let frameCount = 0;
            for await (const frames of stream) {
                if (!this.processing)
                    break;
                frameCount++;
                if (frameCount % 50 === 0)
                    console.log(`[PIPELINE] Processed ${frameCount} frames...`);
                // Deepgram needs raw buffer
                // stream yields Int16Array (PCM 16k mono usually)
                // InputPipeline was validating silence. We can route directly now.
                this.stt.sendAudio(frames.data); // data is Int16Array
            }
        }
        catch (err) {
            console.error(`[PIPELINE] Fatal error in runLoop for ${this.callId}:`, err.message);
        }
        finally {
            this.processing = false;
            console.log(`[PIPELINE] Exited runLoop for ${this.callId}`);
        }
    }
    async handleUserPhrase(text) {
        // 1. Log turn
        await this.logTurn("driver", text);
        // 2. NLP (Language detection, etc)
        const nlpResult = await this.nlp.process(text);
        // 3. Reasoning (LLM + Tools)
        const responseText = await this.reasoning.generate(nlpResult.text);
        // 4. Output (TTS + Audio)
        await this.processTurn(responseText);
    }
    async processTurn(text) {
        await this.logTurn("ai_agent", text);
        await this.output.play(text);
    }
    async logTurn(speaker, text) {
        try {
            await axios.post(`${this.orchestratorUrl}/calls/${this.callId}/turns`, {
                speaker,
                text,
                confidence: 1.0,
                language: "en"
            });
        }
        catch (err) {
            console.error(`[PIPELINE] Failed to log turn:`, err.message);
        }
    }
    destroy() {
        this.processing = false;
        this.stt.stop();
    }
}
//# sourceMappingURL=pipeline.js.map