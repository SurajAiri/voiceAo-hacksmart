import { EventEmitter } from 'events';
import axios from 'axios';
/**
 * Simple event queue for async processing.
 * In production, replace with Redis/RabbitMQ/SQS.
 */
class AsyncEventQueue extends EventEmitter {
    agentServiceUrl;
    constructor() {
        super();
        this.setMaxListeners(100);
        this.agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
        this.setupListeners();
    }
    /**
     * Setup default event listeners.
     */
    setupListeners() {
        // Log all events for audit
        this.on('context_updated', (data) => {
            console.log(`[EVENT] Context updated for call ${data.callId}`);
        });
        this.on('handoff_completed', (data) => {
            console.log(`[EVENT] Handoff completed for call ${data.callId}. Stopping AI Agent...`);
            // Notify agent to stop
            axios.post(`${this.agentServiceUrl}/agent/stop`, { callId: data.callId })
                .catch((err) => console.error(`[EVENT] Failed to stop agent on handoff:`, err.message));
        });
        this.on('call_ended', (data) => {
            console.log(`[EVENT] Call ended: ${data.callId}`);
            // Notify agent to stop
            axios.post(`${this.agentServiceUrl}/agent/stop`, { callId: data.callId })
                .catch((err) => console.error(`[EVENT] Failed to stop agent:`, err.message));
        });
        this.on('call_active', (data) => {
            console.log(`[EVENT] Call active: ${data.callId}. Triggering AI Agent...`);
            // In production, Orchestrator or a dedicated Auth service generates the token.
            // Since Voice Gateway has the keys, we'll assume there's a token generator endpoint
            // or we pass the credentials to the agent (less secure).
            // For Fase 1, we'll just log and assume the agent is triggered.
            // Actually, let's try to hit the agent/start endpoint with a placeholder token.
            // We'll update the agent to handle token generation if missing or we add a helper.
            axios.post(`${this.agentServiceUrl}/agent/start`, {
                callId: data.callId,
                roomName: data.roomName,
                token: "MOCK_TOKEN_NEEDS_GENERATION"
            }).catch((err) => console.error(`[EVENT] Failed to start agent:`, err.message));
        });
        this.on('turn_added', (data) => {
            console.log(`[EVENT] Turn added to call ${data.callId}: ${data.turnId}`);
        });
        this.on('event_logged', (data) => {
            console.log(`[EVENT] Event logged for call ${data.callId}: ${data.type}`);
        });
    }
    /**
     * Emit an event with payload.
     */
    emit(event, payload) {
        return super.emit(event, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    }
}
export const eventQueue = new AsyncEventQueue();
//# sourceMappingURL=async.events.js.map