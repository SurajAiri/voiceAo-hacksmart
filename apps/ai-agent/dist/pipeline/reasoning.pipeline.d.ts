import { LLMMessage } from "@voice-platform/types";
export declare class ReasoningPipeline {
    private history;
    private systemPrompt;
    generate(text: string): Promise<string>;
    getHistory(): LLMMessage[];
}
//# sourceMappingURL=reasoning.pipeline.d.ts.map