import { z } from 'zod';
/**
 * Call lifecycle states
 * CREATED → ACTIVE → HANDED_OFF → ENDED
 */
export declare enum CallStatus {
    CREATED = "CREATED",
    ACTIVE = "ACTIVE",
    HANDED_OFF = "HANDED_OFF",
    ENDED = "ENDED"
}
/**
 * Valid status transitions
 */
export declare const VALID_TRANSITIONS: Record<CallStatus, CallStatus[]>;
/**
 * Call entity interface
 */
export interface Call {
    id: string;
    roomName: string;
    source: string;
    status: CallStatus;
    summary: string | null;
    entities: Record<string, unknown> | null;
    createdAt: Date;
    startedAt: Date | null;
    handedOffAt: Date | null;
    endedAt: Date | null;
    updatedAt: Date;
}
/**
 * Request validation schemas
 */
export declare const CreateCallRequestSchema: z.ZodObject<{
    source: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: string;
}, {
    source: string;
}>;
export type CreateCallRequest = z.infer<typeof CreateCallRequestSchema>;
export interface CreateCallResponse {
    call_id: string;
    room_name: string;
}
/**
 * Validates if a status transition is allowed
 */
export declare function isValidTransition(from: CallStatus, to: CallStatus): boolean;
/**
 * Error thrown when an invalid status transition is attempted
 */
export declare class InvalidTransitionError extends Error {
    constructor(from: CallStatus, to: CallStatus);
}
/**
 * Error thrown when a call is not found
 */
export declare class CallNotFoundError extends Error {
    constructor(callId: string);
}
//# sourceMappingURL=call.model.d.ts.map