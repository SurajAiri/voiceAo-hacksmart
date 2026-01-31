import { generateResponse } from "@voice-platform/llm";
export class ReasoningPipeline {
    history = [];
    systemPrompt = `You are a professional AI voice assistant for a logistics company.
Your goal is to help drivers with booking status, payments, and general support.
Keep your responses short and conversational, as they will be spoken aloud.
Use tool calls to fetch data or perform actions.`;
    async generate(text) {
        this.history.push({ role: 'user', content: text });
        // 1. Generate LLM Response
        const result = await generateResponse({
            messages: [
                { role: 'system', content: this.systemPrompt },
                ...this.history
            ],
            config: {
                maxTokens: 512,
                temperature: 0.5
            }
        });
        // 2. Handle Tool Calls (Simplified for this version)
        // Note: In a production version, we would parse tool calls from the LLM output.
        // Since the current @voice-platform/llm is basic, we'll assume text-only for now
        // unless the user specifies a tool-calling format in the prompt.
        const responseText = result.text;
        this.history.push({ role: 'assistant', content: responseText });
        return responseText;
    }
    getHistory() {
        return this.history;
    }
}
//# sourceMappingURL=reasoning.pipeline.js.map