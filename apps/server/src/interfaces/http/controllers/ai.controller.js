import { aiService } from "../../../application/ai/aiService.js";
import { successResponse } from "../../../shared/response.js";

export const aiController = {
  async score(req, res, next) {
    try {
      const score = await aiService.scoreLead(req.body || {});
      return res.json(successResponse(score));
    } catch (error) {
      return next(error);
    }
  },

  async callScript(req, res, next) {
    try {
      const script = await aiService.generateCallScript(req.body || {});
      return res.json(successResponse({ script }));
    } catch (error) {
      return next(error);
    }
  },

  async personalizeWhatsapp(req, res, next) {
    try {
      const message = await aiService.personalizeWhatsapp(req.body || {});
      return res.json(successResponse({ message }));
    } catch (error) {
      return next(error);
    }
  }
};
