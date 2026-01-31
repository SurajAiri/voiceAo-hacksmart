import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();
/**
 * GET /analytics/calls
 * Get call analytics summary
 */
router.get('/calls', async (req, res, next) => {
    try {
        const { from, to, status } = req.query;
        // Build date filters
        const dateFilter = {};
        if (from) {
            dateFilter.createdAt = { ...dateFilter.createdAt, gte: new Date(from) };
        }
        if (to) {
            dateFilter.createdAt = { ...dateFilter.createdAt, lte: new Date(to) };
        }
        // Get total calls
        const totalCalls = await prisma.call.count({
            where: {
                ...dateFilter,
                ...(status ? { status: status } : {}),
            },
        });
        // Get calls by status
        const callsByStatus = await prisma.call.groupBy({
            by: ['status'],
            _count: true,
            where: dateFilter,
        });
        // Get average duration for ended calls
        const endedCalls = await prisma.call.findMany({
            where: {
                ...dateFilter,
                status: 'ENDED',
                startedAt: { not: null },
                endedAt: { not: null },
            },
            select: {
                startedAt: true,
                endedAt: true,
            },
        });
        let avgDurationSeconds = 0;
        if (endedCalls.length > 0) {
            const totalDuration = endedCalls.reduce((sum, call) => {
                if (call.startedAt && call.endedAt) {
                    return sum + (call.endedAt.getTime() - call.startedAt.getTime());
                }
                return sum;
            }, 0);
            avgDurationSeconds = Math.round(totalDuration / endedCalls.length / 1000);
        }
        // Get handoff rate
        const handoffCalls = await prisma.call.count({
            where: {
                ...dateFilter,
                handedOffAt: { not: null },
            },
        });
        const handoffRate = totalCalls > 0 ? (handoffCalls / totalCalls) * 100 : 0;
        // Get calls by source
        const callsBySource = await prisma.call.groupBy({
            by: ['source'],
            _count: true,
            where: dateFilter,
        });
        res.json({
            total_calls: totalCalls,
            calls_by_status: callsByStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
            avg_duration_seconds: avgDurationSeconds,
            handoff_rate_percent: Math.round(handoffRate * 100) / 100,
            calls_by_source: callsBySource.reduce((acc, item) => ({ ...acc, [item.source]: item._count }), {}),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /analytics/calls/:id
 * Get detailed analytics for a specific call
 */
router.get('/calls/:id', async (req, res, next) => {
    try {
        const call = await prisma.call.findUnique({
            where: { id: req.params.id },
            include: {
                turns: {
                    orderBy: { createdAt: 'asc' },
                },
                events: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!call) {
            res.status(404).json({ error: 'Call not found' });
            return;
        }
        // Calculate duration
        let durationSeconds = null;
        if (call.startedAt) {
            const endTime = call.endedAt || new Date();
            durationSeconds = Math.round((endTime.getTime() - call.startedAt.getTime()) / 1000);
        }
        // Analyze turns
        const turnsBySource = call.turns.reduce((acc, turn) => {
            acc[turn.speaker] = (acc[turn.speaker] || 0) + 1;
            return acc;
        }, {});
        // Analyze languages
        const languageDistribution = call.turns.reduce((acc, turn) => {
            acc[turn.language] = (acc[turn.language] || 0) + 1;
            return acc;
        }, {});
        // Analyze events
        const eventsByType = call.events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        res.json({
            call_id: call.id,
            room_name: call.roomName,
            source: call.source,
            status: call.status,
            summary: call.summary,
            duration_seconds: durationSeconds,
            created_at: call.createdAt.toISOString(),
            started_at: call.startedAt?.toISOString() || null,
            handed_off_at: call.handedOffAt?.toISOString() || null,
            ended_at: call.endedAt?.toISOString() || null,
            analytics: {
                total_turns: call.turns.length,
                turns_by_speaker: turnsBySource,
                language_distribution: languageDistribution,
                total_events: call.events.length,
                events_by_type: eventsByType,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=analytics.controller.js.map