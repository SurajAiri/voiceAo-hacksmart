import { z } from 'zod';
/**
 * Semantic event types that can be logged during a call
 */
export declare enum EventType {
    TOOL_CALL = "TOOL_CALL",
    TOOL_RESULT = "TOOL_RESULT",
    LANGUAGE_SWITCH = "LANGUAGE_SWITCH",
    INTENT_DETECTED = "INTENT_DETECTED",
    FRUSTRATION_DETECTED = "FRUSTRATION_DETECTED",
    HANDOFF_TRIGGERED = "HANDOFF_TRIGGERED",
    AGENT_JOINED = "AGENT_JOINED",
    AGENT_LEFT = "AGENT_LEFT",
    CONTEXT_UPDATED = "CONTEXT_UPDATED",
    ERROR = "ERROR"
}
/**
 * Event entity interface
 */
export interface Event {
    id: string;
    callId: string;
    type: EventType;
    payload: Record<string, unknown>;
    createdAt: Date;
}
/**
 * Request validation schema for creating an event
 */
export declare const CreateEventRequestSchema: z.ZodObject<{
    type: z.ZodNativeEnum<typeof EventType>;
    payload: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    type: EventType;
    payload: Record<string, unknown>;
}, {
    type: EventType;
    payload?: Record<string, unknown> | undefined;
}>;
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;
/**
 * Response for created event
 */
export interface CreateEventResponse {
    event_id: string;
    call_id: string;
    type: EventType;
    created_at: string;
}
//# sourceMappingURL=event.model.d.ts.map