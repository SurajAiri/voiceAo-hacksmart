export declare class AIAgent {
    private room;
    private pipeline;
    private callId;
    private roomName;
    constructor(callId: string, roomName: string);
    start(token: string): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=agent.d.ts.map