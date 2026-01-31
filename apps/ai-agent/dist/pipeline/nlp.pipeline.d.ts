import { LanguageCode } from "@voice-platform/types";
export interface NLPPipelineResult {
    text: string;
    language: LanguageCode;
    confidence: number;
    intent?: string;
}
export declare class NLPPipeline {
    process(text: string): Promise<NLPPipelineResult>;
}
//# sourceMappingURL=nlp.pipeline.d.ts.map