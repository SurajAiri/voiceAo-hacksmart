import { PrismaClient } from '@prisma/client';
import { callService } from './call.service.js';
import { contextService } from './context.service.js';
import { transcriptService } from './transcript.service.js';
import { CallStatus, InvalidTransitionError, isValidTransition } from '../models/call.model.js';
import { EventType } from '../models/event.model.js';
import { eventQueue } from '../queues/async.events.js';
import { AccessToken } from 'livekit-server-sdk';
const prisma = new PrismaClient();
/**
 * HandoffService manages warm handoff orchestration.
 *
 * Handoff can be triggered by:
 * - User request
 * - Repeated failures
 * - High frustration
 * - Tool errors
 */
export class HandoffService {
    /**
     * Evaluates whether a call should be handed off based on rules.
     */
    async evaluateRules(callId) {
        const call = await callService.getCall(callId);
        // Can't handoff if already handed off or ended
        if (call.status === CallStatus.HANDED_OFF || call.status === CallStatus.ENDED) {
            return {
                shouldHandoff: false,
                reason: 'Call already handed off or ended',
                confidence: 1.0,
            };
        }
        // Get recent events to evaluate
        const events = await prisma.event.findMany({
            where: { callId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        // Get recent turns to check for frustration signals
        const turns = await transcriptService.getRecentTurns(callId, 10);
        // Rule 1: Check for explicit handoff request
        const handoffEvents = events.filter((e) => e.type === EventType.HANDOFF_TRIGGERED);
        if (handoffEvents.length > 0) {
            return {
                shouldHandoff: true,
                reason: 'Explicit handoff request',
                confidence: 1.0,
            };
        }
        // Rule 2: Check for repeated tool errors
        const errorEvents = events.filter((e) => e.type === EventType.ERROR);
        if (errorEvents.length >= 3) {
            return {
                shouldHandoff: true,
                reason: 'Multiple tool errors detected',
                confidence: 0.9,
            };
        }
        // Rule 3: Check for frustration signals in turns
        const frustrationSignals = turns.filter((t) => t.speaker === 'driver' && this.detectFrustration(t.text));
        if (frustrationSignals.length >= 2) {
            return {
                shouldHandoff: true,
                reason: 'Customer frustration detected',
                confidence: 0.8,
            };
        }
        // Rule 4: Check for explicit frustration events
        const frustrationEvents = events.filter((e) => e.type === EventType.FRUSTRATION_DETECTED);
        if (frustrationEvents.length >= 2) {
            return {
                shouldHandoff: true,
                reason: 'Frustration events logged',
                confidence: 0.85,
            };
        }
        return {
            shouldHandoff: false,
            reason: null,
            confidence: 1.0,
        };
    }
    /**
     * Marks a call as handed off.
     */
    async markHandedOff(callId) {
        const call = await callService.getCall(callId);
        if (!isValidTransition(call.status, CallStatus.HANDED_OFF)) {
            throw new InvalidTransitionError(call.status, CallStatus.HANDED_OFF);
        }
        await prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.HANDED_OFF,
                handedOffAt: new Date(),
            },
        });
        // Log the handoff event
        await prisma.event.create({
            data: {
                callId,
                type: EventType.HANDOFF_TRIGGERED,
                payload: { timestamp: new Date().toISOString() },
            },
        });
        // Emit handoff event for async processing
        eventQueue.emit('handoff_completed', { callId });
    }
    /**
     * Full handoff orchestration:
     * 1. Evaluate rules (optional)
     * 2. Generate context snapshot
     * 3. Mark call as handed off
     * 4. Return context for human agent
     */
    async requestHandoff(callId) {
        const call = await callService.getCall(callId);
        // Validate state
        if (call.status === CallStatus.HANDED_OFF) {
            return {
                success: false,
                call_id: callId,
                context: null,
                message: 'Call already handed off',
            };
        }
        if (call.status === CallStatus.ENDED) {
            return {
                success: false,
                call_id: callId,
                context: null,
                message: 'Cannot handoff ended call',
            };
        }
        if (call.status === CallStatus.CREATED) {
            return {
                success: false,
                call_id: callId,
                context: null,
                message: 'Cannot handoff call that has not started',
            };
        }
        try {
            // Generate context snapshot before handoff
            const context = await contextService.snapshotContext(callId);
            // Mark as handed off
            await this.markHandedOff(callId);
            // Generate LiveKit Token for Human Agent
            const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
                identity: `agent_human_${callId}`,
                name: "Human Agent",
            });
            at.addGrant({
                roomJoin: true,
                room: call.roomName,
                canPublish: true,
                canSubscribe: true,
            });
            return {
                success: true,
                call_id: callId,
                context,
                access_token: await at.toJwt(),
                message: 'Handoff successful',
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                call_id: callId,
                context: null,
                message: `Handoff failed: ${message}`,
            };
        }
    }
    /**
     * Simple frustration detection from text.
     * Replace with ML model in production.
     */
    detectFrustration(text) {
        const frustrationKeywords = [
            'frustrated',
            'angry',
            'stupid',
            'useless',
            'not working',
            'help me',
            'speak to human',
            'real person',
            'manager',
            'supervisor',
            'kya bakwas',
            'bekaar',
            'bolo nahi',
        ];
        const lowerText = text.toLowerCase();
        return frustrationKeywords.some((keyword) => lowerText.includes(keyword));
    }
}
export const handoffService = new HandoffService();
//# sourceMappingURL=handoff.service.js.map