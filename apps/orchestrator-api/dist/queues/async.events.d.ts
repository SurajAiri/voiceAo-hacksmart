import { EventEmitter } from 'events';
/**
 * Simple event queue for async processing.
 * In production, replace with Redis/RabbitMQ/SQS.
 */
declare class AsyncEventQueue extends EventEmitter {
    private agentServiceUrl;
    constructor();
    /**
     * Setup default event listeners.
     */
    private setupListeners;
    /**
     * Emit an event with payload.
     */
    emit(event: string, payload: Record<string, unknown>): boolean;
}
export declare const eventQueue: AsyncEventQueue;
export {};
//# sourceMappingURL=async.events.d.ts.map