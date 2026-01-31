import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { callService } from '../services/call.service.js';
import { transcriptService } from '../services/transcript.service.js';
import { contextService } from '../services/context.service.js';
import { CreateCallRequestSchema } from '../models/call.model.js';
import { CreateTurnRequestSchema } from '../models/turn.model.js';
import { CreateEventRequestSchema } from '../models/event.model.js';
import { PrismaClient } from '@prisma/client';
import { eventQueue } from '../queues/async.events.js';

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /calls
 * Create a new call
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateCallRequestSchema.parse(req.body);
    const result = await callService.createCall(data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * GET /calls
 * List calls (optional ?status=ACTIVE)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    // Basic validation of status enum
    const filter = status ? { status: status as any } : undefined;
    
    const calls = await callService.listCalls(filter);
    
    res.json({
      calls: calls.map(call => ({
        call_id: call.id,
        room_name: call.roomName,
        status: call.status,
        started_at: call.startedAt?.toISOString() || null,
        created_at: call.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /calls/:id/start
 * Start a call (CREATED → ACTIVE)
 */
router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await callService.startCall(req.params.id);
    res.json({
      call_id: call.id,
      status: call.status,
      started_at: call.startedAt?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /calls/:id/end
 * End a call (terminal state)
 */
router.post('/:id/end', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await callService.endCall(req.params.id);
    
    // Emit call ended event
    eventQueue.emit('call_ended', { callId: call.id });
    
    res.json({
      call_id: call.id,
      status: call.status,
      ended_at: call.endedAt?.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /calls/:id/turns
 * Append a transcript turn
 */
router.post('/:id/turns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateTurnRequestSchema.parse(req.body);
    const result = await transcriptService.persistTurn(req.params.id, data);
    
    // Emit turn added event
    eventQueue.emit('turn_added', { callId: req.params.id, turnId: result.turn_id });
    
    // Update context summary periodically (every 5 turns)
    const turns = await transcriptService.getTurns(req.params.id);
    if (turns.length % 5 === 0) {
      await contextService.updateSummary(req.params.id);
    }
    
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * POST /calls/:id/events
 * Log a semantic event
 */
router.post('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateEventRequestSchema.parse(req.body);
    
    // Verify call exists
    await callService.getCall(req.params.id);
    
    // Create event
    const event = await prisma.event.create({
      data: {
        callId: req.params.id,
        type: data.type,
        payload: data.payload as object,
      },
    });
    
    // Emit event logged
    eventQueue.emit('event_logged', { callId: req.params.id, type: data.type });
    
    res.status(201).json({
      event_id: event.id,
      call_id: event.callId,
      type: event.type,
      created_at: event.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
});

/**
 * GET /calls/:id/context
 * Fetch call context
 */
router.get('/:id/context', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = await contextService.getContext(req.params.id);
    res.json(context);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /calls/:id
 * Get call details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const call = await callService.getCall(req.params.id);
    res.json({
      call_id: call.id,
      room_name: call.roomName,
      source: call.source,
      status: call.status,
      summary: call.summary,
      created_at: call.createdAt.toISOString(),
      started_at: call.startedAt?.toISOString() || null,
      handed_off_at: call.handedOffAt?.toISOString() || null,
      ended_at: call.endedAt?.toISOString() || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /calls/:id/turns
 * Get all turns for a call
 */
router.get('/:id/turns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const turns = await transcriptService.getTurns(req.params.id);
    res.json({
      call_id: req.params.id,
      turns: turns.map((t) => ({
        turn_id: t.id,
        speaker: t.speaker,
        text: t.text,
        confidence: t.confidence,
        language: t.language,
        created_at: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
