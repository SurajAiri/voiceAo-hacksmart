import { languageDetector } from "@voice-platform/nlp";
export class NLPPipeline {
    async process(text) {
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
//# sourceMappingURL=nlp.pipeline.js.map