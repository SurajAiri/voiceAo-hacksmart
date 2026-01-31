import { Router } from 'express';
import { handoffService } from '../services/handoff.service.js';
const router = Router();
/**
 * POST /calls/:id/handoff/request
 * Request warm handoff to human agent
 */
router.post('/:id/handoff/request', async (req, res, next) => {
    try {
        const result = await handoffService.requestHandoff(req.params.id);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.message,
            });
            return;
        }
        res.json({
            success: true,
            call_id: result.call_id,
            message: result.message,
            context: result.context,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /calls/:id/handoff/evaluate
 * Evaluate if handoff should be triggered
 */
router.get('/:id/handoff/evaluate', async (req, res, next) => {
    try {
        const evaluation = await handoffService.evaluateRules(req.params.id);
        res.json({
            call_id: req.params.id,
            should_handoff: evaluation.shouldHandoff,
            reason: evaluation.reason,
            confidence: evaluation.confidence,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=handoff.controller.js.map