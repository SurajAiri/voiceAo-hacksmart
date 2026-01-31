import { Turn, CreateTurnRequest, CreateTurnResponse } from '../models/turn.model.js';
/**
 * TranscriptService handles transcript turn operations.
 *
 * Invariants:
 * - Turns never exist without a call
 * - Cannot add turns to ENDED calls
 */
export declare class TranscriptService {
    /**
     * Validates turn data before persistence.
     */
    validateTurn(data: CreateTurnRequest): void;
    /**
     * Persists a transcript turn to database.
     */
    persistTurn(callId: string, data: CreateTurnRequest): Promise<CreateTurnResponse>;
    /**
     * Retrieves all turns for a call.
     */
    getTurns(callId: string): Promise<Turn[]>;
    /**
     * Gets the latest N turns for a call.
     */
    getRecentTurns(callId: string, limit?: number): Promise<Turn[]>;
}
export declare const transcriptService: TranscriptService;
//# sourceMappingURL=transcript.service.d.ts.map