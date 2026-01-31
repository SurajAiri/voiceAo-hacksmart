import { z } from 'zod';
/**
 * Allowed speaker types for transcript turns
 */
export type Speaker = 'driver' | 'ai_agent' | 'human_agent';
/**
 * Supported languages
 */
export type Language = 'en' | 'hi' | 'hinglish' | 'unknown';
/**
 * Turn entity interface - represents a single utterance in a conversation
 */
export interface Turn {
    id: string;
    callId: string;
    speaker: Speaker;
    text: string;
    confidence: number;
    language: Language;
    createdAt: Date;
}
/**
 * Request validation schema for creating a turn
 */
export declare const CreateTurnRequestSchema: z.ZodObject<{
    speaker: z.ZodEnum<["driver", "ai_agent", "human_agent"]>;
    text: z.ZodString;
    confidence: z.ZodNumber;
    language: z.ZodDefault<z.ZodEnum<["en", "hi", "hinglish", "unknown"]>>;
}, "strip", z.ZodTypeAny, {
    speaker: "driver" | "ai_agent" | "human_agent";
    text: string;
    confidence: number;
    language: "en" | "hi" | "hinglish" | "unknown";
}, {
    speaker: "driver" | "ai_agent" | "human_agent";
    text: string;
    confidence: number;
    language?: "en" | "hi" | "hinglish" | "unknown" | undefined;
}>;
export type CreateTurnRequest = z.infer<typeof CreateTurnRequestSchema>;
/**
 * Response for created turn
 */
export interface CreateTurnResponse {
    turn_id: string;
    call_id: string;
    created_at: string;
}
/**
 * Error thrown when turn validation fails
 */
export declare class TurnValidationError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=turn.model.d.ts.map