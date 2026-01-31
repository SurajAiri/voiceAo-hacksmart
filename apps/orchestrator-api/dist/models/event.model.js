import { z } from 'zod';
/**
 * Semantic event types that can be logged during a call
 */
export var EventType;
(function (EventType) {
    EventType["TOOL_CALL"] = "TOOL_CALL";
    EventType["TOOL_RESULT"] = "TOOL_RESULT";
    EventType["LANGUAGE_SWITCH"] = "LANGUAGE_SWITCH";
    EventType["INTENT_DETECTED"] = "INTENT_DETECTED";
    EventType["FRUSTRATION_DETECTED"] = "FRUSTRATION_DETECTED";
    EventType["HANDOFF_TRIGGERED"] = "HANDOFF_TRIGGERED";
    EventType["AGENT_JOINED"] = "AGENT_JOINED";
    EventType["AGENT_LEFT"] = "AGENT_LEFT";
    EventType["CONTEXT_UPDATED"] = "CONTEXT_UPDATED";
    EventType["ERROR"] = "ERROR";
})(EventType || (EventType = {}));
/**
 * Request validation schema for creating an event
 */
export const CreateEventRequestSchema = z.object({
    type: z.nativeEnum(EventType, {
        errorMap: () => ({ message: `Event type must be one of: ${Object.values(EventType).join(', ')}` }),
    }),
    payload: z.record(z.unknown()).optional().default({}),
});
//# sourceMappingURL=event.model.js.map