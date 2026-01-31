import { 
  Room, 
  RoomEvent, 
  RemoteTrack, 
  Track,
  RemoteAudioTrack
} from "livekit-client";

export class LiveKitService {
  private room: Room;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
  }

  async connect(url: string, token: string): Promise<void> {
    await this.room.connect(url, token);
    console.log("[LIVEKIT] Connected to room", this.room.name);

    // Publish microphone
    await this.room.localParticipant.setMicrophoneEnabled(true);
    await this.room.localParticipant.setCameraEnabled(false);
  }

  disconnect() {
    this.room.disconnect();
  }

  onAudioStream(callback: (track: MediaStreamTrack) => void) {
    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const audioTrack = track as RemoteAudioTrack;
        callback(audioTrack.mediaStreamTrack);
      }
    });
  }
}

export const livekitService = new LiveKitService();
