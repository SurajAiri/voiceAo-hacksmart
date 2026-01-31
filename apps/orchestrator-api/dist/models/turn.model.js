import { z } from 'zod';
/**
 * Request validation schema for creating a turn
 */
export const CreateTurnRequestSchema = z.object({
    speaker: z.enum(['driver', 'ai_agent', 'human_agent'], {
        errorMap: () => ({ message: 'Speaker must be one of: driver, ai_agent, human_agent' }),
    }),
    text: z.string().min(1, 'Text is required'),
    confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
    language: z.enum(['en', 'hi', 'hinglish', 'unknown']).default('unknown'),
});
/**
 * Error thrown when turn validation fails
 */
export class TurnValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TurnValidationError';
    }
}
//# sourceMappingURL=turn.model.js.map