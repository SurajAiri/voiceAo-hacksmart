import { Call, CallStatus, CreateCallRequest, CreateCallResponse } from '../models/call.model.js';
/**
 * CallService handles all call lifecycle operations.
 *
 * Invariants:
 * - A call can only be ended once
 * - Handoff can only happen once
 * - ENDED calls are immutable
 */
export declare class CallService {
    /**
     * Creates a new call record and generates a unique room name.
     */
    createCall(data: CreateCallRequest): Promise<CreateCallResponse & {
        access_token: string;
    }>;
    /**
     * Transitions a call from CREATED to ACTIVE.
     */
    startCall(callId: string): Promise<Call>;
    /**
     * Transitions a call to ENDED state.
     * This is a terminal state - no further transitions are allowed.
     */
    endCall(callId: string): Promise<Call>;
    /**
     * Retrieves a call by ID.
     */
    getCall(callId: string): Promise<Call>;
    /**
     * Lists calls with optional filtering.
     */
    listCalls(filter?: {
        status?: CallStatus;
    }): Promise<Call[]>;
    /**
     * Updates call summary and entities.
     */
    updateContext(callId: string, summary: string, entities: Record<string, unknown>): Promise<Call>;
    /**
     * Maps Prisma call to Call interface.
     */
    private mapToCall;
}
export declare const callService: CallService;
//# sourceMappingURL=call.service.d.ts.map