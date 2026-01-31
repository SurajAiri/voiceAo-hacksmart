import { PrismaClient } from '@prisma/client';
import { callService } from './call.service.js';
import { transcriptService } from './transcript.service.js';
import { eventQueue } from '../queues/async.events.js';
const prisma = new PrismaClient();
/**
 * ContextService manages conversation context and memory.
 */
export class ContextService {
    /**
     * Updates the rolling summary for a call based on recent turns.
     * In a production system, this would use an LLM for summarization.
     */
    async updateSummary(callId) {
        const call = await callService.getCall(callId);
        const turns = await transcriptService.getRecentTurns(callId, 20);
        // Simple summarization - in production, use LLM
        const summary = this.generateSummary(turns);
        await prisma.call.update({
            where: { id: callId },
            data: { summary },
        });
        // Emit context update event
        eventQueue.emit('context_updated', { callId, summary });
        return summary;
    }
    /**
     * Extracts entities from text.
     * In a production system, this would use NER models.
     */
    extractEntities(text) {
        const entities = {};
        // Simple pattern matching - in production, use NER
        const phonePattern = /\b\d{10}\b/g;
        const phones = text.match(phonePattern);
        if (phones) {
            entities.phone_numbers = phones;
        }
        // Extract booking IDs (example pattern)
        const bookingPattern = /\b[A-Z]{2,3}\d{6,8}\b/g;
        const bookings = text.match(bookingPattern);
        if (bookings) {
            entities.booking_ids = bookings;
        }
        return entities;
    }
    /**
     * Creates a context snapshot for handoff to human agent.
     */
    async snapshotContext(callId) {
        const call = await callService.getCall(callId);
        const turns = await transcriptService.getRecentTurns(callId, 10);
        // Ensure we have a summary
        let summary = call.summary || '';
        if (!summary) {
            summary = await this.updateSummary(callId);
        }
        return {
            callId: call.id,
            roomName: call.roomName,
            source: call.source,
            summary,
            entities: call.entities || {},
            recentTurns: turns.map((t) => ({
                speaker: t.speaker,
                text: t.text,
                language: t.language,
            })),
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Returns full context for a call (API response).
     */
    async getContext(callId) {
        const call = await callService.getCall(callId);
        const turns = await transcriptService.getTurns(callId);
        let durationSeconds = null;
        if (call.startedAt) {
            const endTime = call.endedAt || new Date();
            durationSeconds = Math.round((endTime.getTime() - call.startedAt.getTime()) / 1000);
        }
        return {
            call_id: call.id,
            room_name: call.roomName,
            status: call.status,
            source: call.source,
            summary: call.summary,
            entities: call.entities,
            turns_count: turns.length,
            duration_seconds: durationSeconds,
            created_at: call.createdAt.toISOString(),
            started_at: call.startedAt?.toISOString() || null,
        };
    }
    /**
     * Simple summary generation from turns.
     * Replace with LLM-based summarization in production.
     */
    generateSummary(turns) {
        if (turns.length === 0) {
            return 'No conversation yet.';
        }
        const driverTurns = turns.filter((t) => t.speaker === 'driver');
        const topics = new Set();
        // Extract key topics from driver messages
        for (const turn of driverTurns) {
            const text = turn.text.toLowerCase();
            if (text.includes('booking') || text.includes('cancel')) {
                topics.add('booking issue');
            }
            if (text.includes('payment') || text.includes('refund')) {
                topics.add('payment concern');
            }
            if (text.includes('help') || text.includes('problem')) {
                topics.add('needs assistance');
            }
        }
        const topicList = Array.from(topics);
        if (topicList.length > 0) {
            return `Driver discussing: ${topicList.join(', ')}. ${turns.length} turns in conversation.`;
        }
        return `Conversation with ${turns.length} turns.`;
    }
}
export const contextService = new ContextService();
//# sourceMappingURL=context.service.js.map