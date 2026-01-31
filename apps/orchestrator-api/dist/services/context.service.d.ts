/**
 * Context snapshot delivered to human agents during handoff
 */
export interface ContextSnapshot {
    callId: string;
    roomName: string;
    source: string;
    summary: string;
    entities: Record<string, unknown>;
    recentTurns: Array<{
        speaker: string;
        text: string;
        language: string;
    }>;
    createdAt: string;
}
/**
 * Full call context returned via API
 */
export interface CallContext {
    call_id: string;
    room_name: string;
    status: string;
    source: string;
    summary: string | null;
    entities: Record<string, unknown> | null;
    turns_count: number;
    duration_seconds: number | null;
    created_at: string;
    started_at: string | null;
}
/**
 * ContextService manages conversation context and memory.
 */
export declare class ContextService {
    /**
     * Updates the rolling summary for a call based on recent turns.
     * In a production system, this would use an LLM for summarization.
     */
    updateSummary(callId: string): Promise<string>;
    /**
     * Extracts entities from text.
     * In a production system, this would use NER models.
     */
    extractEntities(text: string): Record<string, unknown>;
    /**
     * Creates a context snapshot for handoff to human agent.
     */
    snapshotContext(callId: string): Promise<ContextSnapshot>;
    /**
     * Returns full context for a call (API response).
     */
    getContext(callId: string): Promise<CallContext>;
    /**
     * Simple summary generation from turns.
     * Replace with LLM-based summarization in production.
     */
    private generateSummary;
}
export declare const contextService: ContextService;
//# sourceMappingURL=context.service.d.ts.map