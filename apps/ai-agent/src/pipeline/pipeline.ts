import { 
  Room, 
  RemoteAudioTrack, 
  AudioStream, 
  AudioSource, 
  LocalAudioTrack,
  TrackSource,
  TrackPublishOptions,
} from "@livekit/rtc-node";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { InputPipeline } from "./input.pipeline.js";
import { NLPPipeline } from "./nlp.pipeline.js";
import { ReasoningPipeline } from "./reasoning.pipeline.js";
import { OutputPipeline } from "./output.pipeline.js";

import { DeepgramService } from "../services/deepgram.service.js";

// Debug mode - set to true to save audio recordings
const DEBUG_AUDIO = true;
const DEBUG_AUDIO_DIR = "./debug_recordings";

export class ConversationPipeline {
  private input: InputPipeline;
  private nlp: NLPPipeline;
  private reasoning: ReasoningPipeline;
  private output: OutputPipeline;
  private outputSource: AudioSource;
  
  private processing: boolean = false;
  private isSpeaking: boolean = false;
  private orchestratorUrl: string;

  // STT Service
  private stt: DeepgramService;
  
  // Debug audio recording
  private audioChunks: Int16Array[] = [];
  private recordingStartTime: number = 0;

  constructor(private callId: string, private room: Room) {
    this.outputSource = new AudioSource(16000, 1);
    
    this.input = new InputPipeline();
    this.nlp = new NLPPipeline();
    this.reasoning = new ReasoningPipeline();
    this.output = new OutputPipeline(this.outputSource);
    
    this.stt = new DeepgramService();
    this.orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:3000";
    
    // Create debug directory if needed
    if (DEBUG_AUDIO && !fs.existsSync(DEBUG_AUDIO_DIR)) {
      fs.mkdirSync(DEBUG_AUDIO_DIR, { recursive: true });
    }
    
    console.log(`\n========================================`);
    console.log(`[PIPELINE] Created for call ${this.callId}`);
    console.log(`[DEBUG] Audio recording: ${DEBUG_AUDIO ? 'ENABLED' : 'disabled'}`);
    console.log(`========================================\n`);
  }

  async start() {
    console.log(`[PIPELINE] Starting pipeline for ${this.callId}...`);
    
    // 1. Publish agent voice track
    const localTrack = LocalAudioTrack.createAudioTrack("agent-voice", this.outputSource);
    const options = new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE });
    
    if (this.room.localParticipant) {
      await this.room.localParticipant.publishTrack(localTrack, options);
      console.log(`[PIPELINE] ✓ Agent voice track published`);
    } else {
      console.error(`[PIPELINE] ✗ No local participant in room!`);
    }

    // 2. Connect STT with proper await
    console.log(`[PIPELINE] Connecting to Deepgram STT...`);
    try {
      await this.stt.startStream();
      console.log(`[PIPELINE] ✓ Deepgram STT connected and ready`);
    } catch (err: any) {
      console.error(`[PIPELINE] ✗ STT connection failed:`, err.message);
      console.error(`[PIPELINE] Agent will speak but cannot hear user!`);
    }
    
    // 3. Setup STT event handlers
    this.stt.on('transcription', async (text: string) => {
      console.log(`\n>>> [STT] Transcript: "${text}"`);
      if (text.trim().length > 0) {
        await this.handleUserPhrase(text);
      }
    });
    
    this.stt.on('utterance_end', () => {
      console.log(`[STT] User stopped speaking`);
    });

    // 4. Send initial greeting
    console.log(`[PIPELINE] Sending initial greeting...`);
    await this.processTurn("Hello, I am your AI support assistant. How can I help you today?");
    console.log(`[PIPELINE] ✓ Pipeline ready and waiting for user audio\n`);
  }

  attachInput(track: RemoteAudioTrack) {
    console.log(`\n[PIPELINE] 🎤 Attaching audio input from user track: ${track.sid}`);
    const stream = new AudioStream(track);
    this.recordingStartTime = Date.now();
    this.runLoop(stream).catch(err => {
      console.error("[PIPELINE] ✗ Audio loop error:", err);
    });
  }

  private async runLoop(stream: AudioStream) {
    if (this.processing) {
      console.log(`[PIPELINE] Audio loop already running, skipping duplicate`);
      return;
    }
    
    this.processing = true;
    this.audioChunks = []; // Reset for new recording
    
    console.log(`[PIPELINE] 🔊 Audio processing loop STARTED`);
    console.log(`[PIPELINE] Waiting for audio frames from user...\n`);

    try {
      let frameCount = 0;
      let lastLogTime = Date.now();
      let bytesSent = 0;
      
      for await (const frame of stream) {
        if (!this.processing) {
          console.log(`[PIPELINE] Processing stopped, exiting loop`);
          break;
        }
        
        frameCount++;
        const frameBytes = frame.data.byteLength;
        bytesSent += frameBytes;
        
        // Store audio for debug recording
        if (DEBUG_AUDIO) {
          this.audioChunks.push(new Int16Array(frame.data));
        }
        
        // Log every 2 seconds
        const now = Date.now();
        if (now - lastLogTime >= 2000) {
          console.log(`[AUDIO] Receiving: ${frameCount} frames, ${(bytesSent / 1024).toFixed(1)}KB total`);
          lastLogTime = now;
        }
        
        // Send to Deepgram
        this.stt.sendAudio(frame.data);
      }
      
      console.log(`[PIPELINE] Audio stream ended after ${frameCount} frames`);
      
      // Save debug recording
      if (DEBUG_AUDIO && this.audioChunks.length > 0) {
        this.saveDebugRecording();
      }
    } catch (err: any) {
      console.error(`[PIPELINE] ✗ Fatal error in audio loop:`, err.message);
    } finally {
      this.processing = false;
      console.log(`[PIPELINE] 🔇 Audio processing loop STOPPED`);
    }
  }
  
  private saveDebugRecording() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(DEBUG_AUDIO_DIR, `call_${this.callId.substring(0, 8)}_${timestamp}.wav`);
    
    // Calculate total samples
    const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Int16Array(totalSamples);
    
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Create WAV file
    const wavBuffer = this.createWavBuffer(combined, 16000, 1);
    fs.writeFileSync(filename, wavBuffer);
    
    const durationSec = totalSamples / 16000;
    console.log(`\n[DEBUG] 📁 Audio saved: ${filename}`);
    console.log(`[DEBUG] Duration: ${durationSec.toFixed(1)}s, Size: ${(wavBuffer.byteLength / 1024).toFixed(1)}KB\n`);
  }
  
  private createWavBuffer(samples: Int16Array, sampleRate: number, channels: number): Buffer {
    const dataSize = samples.byteLength;
    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
    buffer.writeUInt16LE(channels * 2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Audio data
    Buffer.from(samples.buffer).copy(buffer, 44);
    
    return buffer;
  }

  private async handleUserPhrase(text: string) {
    console.log(`\n----------------------------------------`);
    console.log(`[USER] "${text}"`);
    console.log(`----------------------------------------`);
    
    // Log turn to orchestrator
    this.logTurn("driver", text).catch(() => {});

    // NLP (Language detection)
    console.log(`[NLP] Processing...`);
    const nlpResult = await this.nlp.process(text);
    console.log(`[NLP] Language: ${nlpResult.language} (${(nlpResult.confidence * 100).toFixed(0)}%)`);

    // LLM Reasoning
    console.log(`[LLM] Generating response...`);
    const startTime = Date.now();
    const responseText = await this.reasoning.generate(nlpResult.text);
    const llmTime = Date.now() - startTime;
    console.log(`[LLM] Response ready (${llmTime}ms)`);

    // Output (TTS + Audio)
    await this.processTurn(responseText);
  }

  private async processTurn(text: string) {
    console.log(`\n[AI] 🔊 Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    this.isSpeaking = true;
    
    const startTime = Date.now();
    this.logTurn("ai_agent", text).catch(() => {});
    await this.output.play(text);
    const speakTime = Date.now() - startTime;
    
    this.isSpeaking = false;
    console.log(`[AI] ✓ Finished speaking (${speakTime}ms)\n`);
  }

  private async logTurn(speaker: string, text: string) {
    try {
      await axios.post(`${this.orchestratorUrl}/calls/${this.callId}/turns`, {
        speaker,
        text,
        confidence: 1.0,
        language: "en"
      });
    } catch (err: any) {
      // Silent fail for logging - not critical
    }
  }

  destroy() {
    console.log(`[PIPELINE] Destroying pipeline for ${this.callId}`);
    this.processing = false;
    
    // Save recording on destroy
    if (DEBUG_AUDIO && this.audioChunks.length > 0) {
      this.saveDebugRecording();
    }
    
    this.stt.stop();
  }
}
