import { generateResponse } from "@voice-platform/llm";
import { LLMMessage } from "@voice-platform/types";
import { defaultExecutor } from "@voice-platform/tools";

export class ReasoningPipeline {
  private history: LLMMessage[] = [];
  private systemPrompt: string = `You are a professional AI voice assistant for a logistics company.
Your goal is to help drivers with booking status, payments, and general support.
Keep your responses short and conversational, as they will be spoken aloud.
Use tool calls to fetch data or perform actions.`;

  async generate(text: string): Promise<string> {
    this.history.push({ role: 'user', content: text });

    try {
      // Generate LLM Response
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

      const responseText = result.text;
      this.history.push({ role: 'assistant', content: responseText });

      return responseText;
    } catch (err: any) {
      console.error(`[LLM] ✗ Error:`, err.message);
      return "I'm sorry, I'm having trouble processing that right now. Could you please try again?";
    }
  }

  getHistory() {
    return this.history;
  }
}
