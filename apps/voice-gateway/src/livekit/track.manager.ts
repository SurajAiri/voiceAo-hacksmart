import { ParticipantRole } from "./participant.manager"

type LiveKitTrack = {
  sid: string
  kind: "audio" | "video"
}

type LiveKitParticipant = {
  identity: string
  metadata?: string
}

export class TrackManager {
  private activeTracks = new Map<string, LiveKitTrack>()

  onTrackPublished(
    track: LiveKitTrack,
    participant: LiveKitParticipant,
    role: ParticipantRole
  ) {
    // 1️⃣ Only audio
    if (track.kind !== "audio") {
      return
    }

    // 2️⃣ Never subscribe to bot audio
    if (role === "bot") {
      return
    }

    // 3️⃣ Idempotent attach
    if (this.activeTracks.has(track.sid)) {
      return
    }

    this.activeTracks.set(track.sid, track)

    console.log("[TRACK] Audio track attached", {
      trackSid: track.sid,
      participant: participant.identity,
      role,
    })
  }

  onTrackUnpublished(trackSid: string) {
    if (!this.activeTracks.has(trackSid)) {
      return
    }

    this.activeTracks.delete(trackSid)

    console.log("[TRACK] Audio track detached", {
      trackSid,
    })
  }
}
