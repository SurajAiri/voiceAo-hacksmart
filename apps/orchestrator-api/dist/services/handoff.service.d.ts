import { ContextSnapshot } from './context.service.js';
/**
 * Handoff evaluation result
 */
export interface HandoffEvaluation {
    shouldHandoff: boolean;
    reason: string | null;
    confidence: number;
}
/**
 * Handoff request result
 */
export interface HandoffResult {
    success: boolean;
    call_id: string;
    context: ContextSnapshot | null;
    access_token?: string;
    message: string;
}
/**
 * HandoffService manages warm handoff orchestration.
 *
 * Handoff can be triggered by:
 * - User request
 * - Repeated failures
 * - High frustration
 * - Tool errors
 */
export declare class HandoffService {
    /**
     * Evaluates whether a call should be handed off based on rules.
     */
    evaluateRules(callId: string): Promise<HandoffEvaluation>;
    /**
     * Marks a call as handed off.
     */
    markHandedOff(callId: string): Promise<void>;
    /**
     * Full handoff orchestration:
     * 1. Evaluate rules (optional)
     * 2. Generate context snapshot
     * 3. Mark call as handed off
     * 4. Return context for human agent
     */
    requestHandoff(callId: string): Promise<HandoffResult>;
    /**
     * Simple frustration detection from text.
     * Replace with ML model in production.
     */
    private detectFrustration;
}
export declare const handoffService: HandoffService;
//# sourceMappingURL=handoff.service.d.ts.map