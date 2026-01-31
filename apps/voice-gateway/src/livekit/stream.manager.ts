import {
  Room,
  RoomEvent,
  RemoteTrack,
  TrackKind,
  RemoteAudioTrack,
  LocalAudioTrack,
  AudioFrame as LiveKitAudioFrame,
  AudioSource,
  AudioStream,
  TrackSource,
} from "@livekit/rtc-node"
// import { TrackPublishOptions } from "@livekit/rtc-node/dist/proto/room_pb.js"
import { AudioIngress } from "../streaming/audio.ingress"
import { AudioEgress } from "../streaming/audio.egress"
import { AccessToken } from "livekit-server-sdk"

export class StreamManager {
  private activeRooms = new Map<string, Room>()
  private ingress: AudioIngress
  private egress: AudioEgress

  constructor(
    private url: string,
    private apiKey: string,
    private apiSecret: string
  ) {
    this.ingress = new AudioIngress()
    this.egress = new AudioEgress()
  }

  getIngress() { return this.ingress }
  getEgress() { return this.egress }

  async joinRoom(callId: string) {
    if (this.activeRooms.has(callId)) return

    const roomName = `call_${callId}`
    const room = new Room()
    
    const source = new AudioSource(16000, 1) // Mono 16kHz

    this.activeRooms.set(callId, room)

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === TrackKind.KIND_AUDIO) {
        const audioTrack = track as RemoteAudioTrack
        console.log(`[STREAM] Subscribed to audio track: ${audioTrack.sid}`)
        
        const stream = new AudioStream(audioTrack)
        const processStream = async () => {
          for await (const frame of stream) {
            this.ingress.onAudioFrame({
              data: frame.data,
              timestamp: Date.now(),
              duration: (frame.samplesPerChannel / frame.sampleRate) * 1000,
              sampleRate: frame.sampleRate,
              channels: frame.channels,
            })
          }
        }
        processStream().catch(console.error)
      }
    })

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: `gateway_${callId}`,
      name: "Voice Gateway",
    })
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    })
    const token = await at.toJwt()

    try {
      await room.connect(this.url, token)
      console.log(`[STREAM] Gateway joined room: ${roomName}`)

      // Publish bot audio track (Egress)
      const localTrack = LocalAudioTrack.createAudioTrack("gateway-audio", source)
      if (room.localParticipant) {
        // const options = new TrackPublishOptions({
        //   source: TrackSource.SOURCE_MICROPHONE,
        // });
        await room.localParticipant.publishTrack(localTrack, { source: TrackSource.SOURCE_MICROPHONE } as any)
        this.egress.addActiveSource(callId, source)
      }
    } catch (err) {
      console.error(`[STREAM] Failed to join room ${roomName}:`, err)
      this.activeRooms.delete(callId)
    }
  }

  async leaveRoom(callId: string) {
    const room = this.activeRooms.get(callId)
    if (room) {
      await room.disconnect()
      this.egress.removeActiveSource(callId)
      this.activeRooms.delete(callId)
      console.log(`[STREAM] Gateway left room: ${callId}`)
    }
  }
}
