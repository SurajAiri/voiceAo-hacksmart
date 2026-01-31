import { languageDetector } from "@voice-platform/nlp";
import { LanguageCode } from "@voice-platform/types";

export interface NLPPipelineResult {
  text: string;
  language: LanguageCode;
  confidence: number;
  intent?: string;
}

export class NLPPipeline {
  async process(text: string): Promise<NLPPipelineResult> {
    const result = await languageDetector.detectLanguage(text);
    
    // In a real implementation, we would also run intent detection here
    // using the shared intentDetector from @voice-platform/nlp
    
    return {
      text,
      language: result.language,
      confidence: result.confidence
    };
  }
}
