import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { CallStatus, isValidTransition, InvalidTransitionError, CallNotFoundError, } from '../models/call.model.js';
import { AccessToken } from 'livekit-server-sdk';
const prisma = new PrismaClient();
/**
 * CallService handles all call lifecycle operations.
 *
 * Invariants:
 * - A call can only be ended once
 * - Handoff can only happen once
 * - ENDED calls are immutable
 */
export class CallService {
    /**
     * Creates a new call record and generates a unique room name.
     */
    async createCall(data) {
        const callId = nanoid(12);
        const roomName = `call_${callId}`;
        const call = await prisma.call.create({
            data: {
                id: callId,
                roomName,
                source: data.source,
                status: CallStatus.CREATED,
            },
        });
        // Generate LiveKit Token for Driver
        const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: `driver_${call.id}`,
            name: "Driver",
        });
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });
        return {
            call_id: call.id,
            room_name: call.roomName,
            access_token: await at.toJwt(),
        };
    }
    /**
     * Transitions a call from CREATED to ACTIVE.
     */
    async startCall(callId) {
        const call = await this.getCall(callId);
        if (!isValidTransition(call.status, CallStatus.ACTIVE)) {
            throw new InvalidTransitionError(call.status, CallStatus.ACTIVE);
        }
        const updated = await prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.ACTIVE,
                startedAt: new Date(),
            },
        });
        const updatedCall = this.mapToCall(updated);
        // Emit call active event
        import('../queues/async.events.js').then(({ eventQueue }) => {
            eventQueue.emit('call_active', { callId: updatedCall.id, roomName: updatedCall.roomName });
        });
        return updatedCall;
    }
    /**
     * Transitions a call to ENDED state.
     * This is a terminal state - no further transitions are allowed.
     */
    async endCall(callId) {
        const call = await this.getCall(callId);
        if (!isValidTransition(call.status, CallStatus.ENDED)) {
            throw new InvalidTransitionError(call.status, CallStatus.ENDED);
        }
        const updated = await prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.ENDED,
                endedAt: new Date(),
            },
        });
        return this.mapToCall(updated);
    }
    /**
     * Retrieves a call by ID.
     */
    async getCall(callId) {
        const call = await prisma.call.findUnique({
            where: { id: callId },
        });
        if (!call) {
            throw new CallNotFoundError(callId);
        }
        return this.mapToCall(call);
    }
    /**
     * Lists calls with optional filtering.
     */
    async listCalls(filter) {
        const where = {};
        if (filter?.status) {
            where.status = filter.status;
        }
        const calls = await prisma.call.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return calls.map(this.mapToCall);
    }
    /**
     * Updates call summary and entities.
     */
    async updateContext(callId, summary, entities) {
        const call = await this.getCall(callId);
        if (call.status === CallStatus.ENDED) {
            throw new Error('Cannot update context of ended call');
        }
        const updated = await prisma.call.update({
            where: { id: callId },
            data: {
                summary,
                entities: entities,
            },
        });
        return this.mapToCall(updated);
    }
    /**
     * Maps Prisma call to Call interface.
     */
    mapToCall(prismaCall) {
        return {
            id: prismaCall.id,
            roomName: prismaCall.roomName,
            source: prismaCall.source,
            status: prismaCall.status,
            summary: prismaCall.summary,
            entities: prismaCall.entities,
            createdAt: prismaCall.createdAt,
            startedAt: prismaCall.startedAt,
            handedOffAt: prismaCall.handedOffAt,
            endedAt: prismaCall.endedAt,
            updatedAt: prismaCall.updatedAt,
        };
    }
}
export const callService = new CallService();
//# sourceMappingURL=call.service.js.map