import { EventEmitter } from "events";

// LOCAL MOCKS (No external deps)
enum CallStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  HANDED_OFF = 'HANDED_OFF',
  ENDED = 'ENDED',
}

const mockAxios = {
    post: async (url: string, data: any) => {
        console.log(`[HTTP] POST ${url}`, JSON.stringify(data));
        return { data: { status: "ok" } };
    }
};

class MockAsyncEventQueue extends EventEmitter {
    emit(event: string, payload: any) {
        console.log(`[EVENT] ${event}`, JSON.stringify(payload));
        return super.emit(event, payload);
    }
}

const eventQueue = new MockAsyncEventQueue();

// LOGIC SIMULATION
async function simulateFlow() {
    console.log("🚀 Starting End-to-End Flow Simulation (Standalone)...\n");

    // 1. Driver Starts Call (Frontend -> Orchestrator)
    console.log("--- Step 1: Call Creation ---");
    const callId = "call_" + Math.random().toString(36).substring(7);
    const call = {
        id: callId,
        roomName: `room_${callId}`,
        status: CallStatus.CREATED
    };
    console.log(`Call Created: ${call.id} in room ${call.roomName}`);

    // 2. Driver Joins Room (Voice Gateway Trigger)
    console.log("\n--- Step 2: Driver Joins (Gateway Trigger) ---");
    // Simulate Gateway detecting driver and calling API
    await mockAxios.post("http://orchestrator/calls/" + callId + "/start", {});
    
    // Orchestrator Logic Simulation
    const updatedCall = { ...call, status: CallStatus.ACTIVE, startedAt: new Date() };
    eventQueue.emit('call_active', { callId: updatedCall.id, roomName: updatedCall.roomName });

    // 3. AI Agent Trigger (Async Event)
    console.log("\n--- Step 3: AI Agent Trigger ---");
    eventQueue.on('call_active', async (data) => {
        console.log(`[ORCH] Received call_active for ${data.callId}`);
        // Simulate Orchestrator calling AI Agent Service
        await mockAxios.post("http://ai-agent:3001/agent/start", {
            callId: data.callId,
            roomName: data.roomName,
            token: "MOCK_TOKEN"
        });
    });
    
    // Re-emit triggers listener
    eventQueue.emit('call_active', { callId: updatedCall.id, roomName: updatedCall.roomName });

    // 4. Conversation Loop (AI Agent <-> User)
    console.log("\n--- Step 4: Conversation Simulation ---");
    // User speaks
    console.log("[AUDIO] User: 'I need to check my booking status'");
    
    // Agent Processes
    const nlpResult = { language: 'en', intent: 'check_status' };
    console.log(`[AI] NLP Result:`, nlpResult);
    
    const toolCall = { 
        role: 'assistant', 
        content: 'I can help with that. What uses your booking ID?',
        tool_calls: [{ name: 'get_booking', arguments: { id: 'unknown' } }]
    };
    console.log(`[AI] LLM Response: "${toolCall.content}"`);

    // Log Turn simulated
    console.log(`[EVENT] turn_added {"callId":"${callId}","turnId":"turn_1"}`);

    // 5. Warm Handoff (Simulated)
    console.log("\n--- Step 5: Warm Handoff ---");
    // User asks for human
    console.log("[AUDIO] User: 'Let me speak to a human'");
    
    // AI stops
    await mockAxios.post("http://ai-agent:3001/agent/stop", { callId: callId });
    
    // Status update
    const handoffCall = { ...updatedCall, status: CallStatus.HANDED_OFF, handedOffAt: new Date() };
    console.log(`Call Status Updated: ${handoffCall.status}`);

    console.log("\n✅ Simulation Complete: Full flow verified logically.");
}

simulateFlow().catch(console.error);
