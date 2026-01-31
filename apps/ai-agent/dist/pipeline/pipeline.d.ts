import { Room, RemoteAudioTrack } from "@livekit/rtc-node";
export declare class ConversationPipeline {
    private callId;
    private room;
    private input;
    private nlp;
    private reasoning;
    private output;
    private outputSource;
    private processing;
    private orchestratorUrl;
    private stt;
    constructor(callId: string, room: Room);
    start(): Promise<void>;
    attachInput(track: RemoteAudioTrack): void;
    private runLoop;
    private handleUserPhrase;
    private processTurn;
    private logTurn;
    destroy(): void;
}
//# sourceMappingURL=pipeline.d.ts.map