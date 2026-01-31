import { PrismaClient } from '@prisma/client';
import { TurnValidationError, } from '../models/turn.model.js';
import { callService } from './call.service.js';
import { CallStatus } from '../models/call.model.js';
const prisma = new PrismaClient();
/**
 * TranscriptService handles transcript turn operations.
 *
 * Invariants:
 * - Turns never exist without a call
 * - Cannot add turns to ENDED calls
 */
export class TranscriptService {
    /**
     * Validates turn data before persistence.
     */
    validateTurn(data) {
        if (!data.text || data.text.trim().length === 0) {
            throw new TurnValidationError('Text cannot be empty');
        }
        if (data.confidence < 0 || data.confidence > 1) {
            throw new TurnValidationError('Confidence must be between 0 and 1');
        }
    }
    /**
     * Persists a transcript turn to database.
     */
    async persistTurn(callId, data) {
        // Verify call exists and is not ended
        const call = await callService.getCall(callId);
        if (call.status === CallStatus.ENDED) {
            throw new TurnValidationError('Cannot add turns to ended call');
        }
        // Validate turn data
        this.validateTurn(data);
        // Persist turn
        const turn = await prisma.turn.create({
            data: {
                callId,
                speaker: data.speaker,
                text: data.text,
                confidence: data.confidence,
                language: data.language,
            },
        });
        return {
            turn_id: turn.id,
            call_id: turn.callId,
            created_at: turn.createdAt.toISOString(),
        };
    }
    /**
     * Retrieves all turns for a call.
     */
    async getTurns(callId) {
        // Verify call exists
        await callService.getCall(callId);
        const turns = await prisma.turn.findMany({
            where: { callId },
            orderBy: { createdAt: 'asc' },
        });
        return turns.map((t) => ({
            id: t.id,
            callId: t.callId,
            speaker: t.speaker,
            text: t.text,
            confidence: t.confidence,
            language: t.language,
            createdAt: t.createdAt,
        }));
    }
    /**
     * Gets the latest N turns for a call.
     */
    async getRecentTurns(callId, limit = 10) {
        await callService.getCall(callId);
        const turns = await prisma.turn.findMany({
            where: { callId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return turns
            .reverse()
            .map((t) => ({
            id: t.id,
            callId: t.callId,
            speaker: t.speaker,
            text: t.text,
            confidence: t.confidence,
            language: t.language,
            createdAt: t.createdAt,
        }));
    }
}
export const transcriptService = new TranscriptService();
//# sourceMappingURL=transcript.service.js.map