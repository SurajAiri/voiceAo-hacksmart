"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamManager = void 0;
const rtc_node_1 = require("@livekit/rtc-node");
// import { TrackPublishOptions } from "@livekit/rtc-node/dist/proto/room_pb.js"
const audio_ingress_1 = require("../streaming/audio.ingress");
const audio_egress_1 = require("../streaming/audio.egress");
const livekit_server_sdk_1 = require("livekit-server-sdk");
class StreamManager {
    constructor(url, apiKey, apiSecret) {
        this.url = url;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.activeRooms = new Map();
        this.ingress = new audio_ingress_1.AudioIngress();
        this.egress = new audio_egress_1.AudioEgress();
    }
    getIngress() { return this.ingress; }
    getEgress() { return this.egress; }
    async joinRoom(callId) {
        if (this.activeRooms.has(callId))
            return;
        const roomName = `call_${callId}`;
        const room = new rtc_node_1.Room();
        const source = new rtc_node_1.AudioSource(16000, 1); // Mono 16kHz
        this.activeRooms.set(callId, room);
        room.on(rtc_node_1.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === rtc_node_1.TrackKind.KIND_AUDIO) {
                const audioTrack = track;
                console.log(`[STREAM] Subscribed to audio track: ${audioTrack.sid}`);
                const stream = new rtc_node_1.AudioStream(audioTrack);
                const processStream = async () => {
                    for await (const frame of stream) {
                        this.ingress.onAudioFrame({
                            data: frame.data,
                            timestamp: Date.now(),
                            duration: (frame.samplesPerChannel / frame.sampleRate) * 1000,
                            sampleRate: frame.sampleRate,
                            channels: frame.channels,
                        });
                    }
                };
                processStream().catch(console.error);
            }
        });
        const at = new livekit_server_sdk_1.AccessToken(this.apiKey, this.apiSecret, {
            identity: `gateway_${callId}`,
            name: "Voice Gateway",
        });
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });
        const token = await at.toJwt();
        try {
            await room.connect(this.url, token);
            console.log(`[STREAM] Gateway joined room: ${roomName}`);
            // Publish bot audio track (Egress)
            const localTrack = rtc_node_1.LocalAudioTrack.createAudioTrack("gateway-audio", source);
            if (room.localParticipant) {
                // const options = new TrackPublishOptions({
                //   source: TrackSource.SOURCE_MICROPHONE,
                // });
                await room.localParticipant.publishTrack(localTrack, { source: rtc_node_1.TrackSource.SOURCE_MICROPHONE });
                this.egress.addActiveSource(callId, source);
            }
        }
        catch (err) {
            console.error(`[STREAM] Failed to join room ${roomName}:`, err);
            this.activeRooms.delete(callId);
        }
    }
    async leaveRoom(callId) {
        const room = this.activeRooms.get(callId);
        if (room) {
            await room.disconnect();
            this.egress.removeActiveSource(callId);
            this.activeRooms.delete(callId);
            console.log(`[STREAM] Gateway left room: ${callId}`);
        }
    }
}
exports.StreamManager = StreamManager;
