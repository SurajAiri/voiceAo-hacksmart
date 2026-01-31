import { z } from 'zod';
/**
 * Call lifecycle states
 * CREATED → ACTIVE → HANDED_OFF → ENDED
 */
export var CallStatus;
(function (CallStatus) {
    CallStatus["CREATED"] = "CREATED";
    CallStatus["ACTIVE"] = "ACTIVE";
    CallStatus["HANDED_OFF"] = "HANDED_OFF";
    CallStatus["ENDED"] = "ENDED";
})(CallStatus || (CallStatus = {}));
/**
 * Valid status transitions
 */
export const VALID_TRANSITIONS = {
    [CallStatus.CREATED]: [CallStatus.ACTIVE, CallStatus.ENDED],
    [CallStatus.ACTIVE]: [CallStatus.HANDED_OFF, CallStatus.ENDED],
    [CallStatus.HANDED_OFF]: [CallStatus.ENDED],
    [CallStatus.ENDED]: [], // Terminal state - no transitions allowed
};
/**
 * Request validation schemas
 */
export const CreateCallRequestSchema = z.object({
    source: z.string().min(1, 'Source is required'),
});
/**
 * Validates if a status transition is allowed
 */
export function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from].includes(to);
}
/**
 * Error thrown when an invalid status transition is attempted
 */
export class InvalidTransitionError extends Error {
    constructor(from, to) {
        super(`Invalid transition from ${from} to ${to}`);
        this.name = 'InvalidTransitionError';
    }
}
/**
 * Error thrown when a call is not found
 */
export class CallNotFoundError extends Error {
    constructor(callId) {
        super(`Call not found: ${callId}`);
        this.name = 'CallNotFoundError';
    }
}
//# sourceMappingURL=call.model.js.map