import { webhookIngestService } from "../../../application/services/webhookIngestService.js";
import { successResponse } from "../../../shared/response.js";
import {
  isAlreadyProcessed,
  markWebhookProcessed
} from "../middleware/webhookSecurity.js";

export const webhooksController = {
  async vapi(req, res, next) {
    try {
      const result = await webhookIngestService.ingestVapi(req.body);
      if (result.duplicate) {
        return res.json(successResponse({ duplicate: true }));
      }
      return res.json(successResponse({}));
    } catch (error) {
      return next(error);
    }
  },

  async wati(req, res, next) {
    try {
      const eventId = req.body?.eventId || req.body?.id;
      if (await isAlreadyProcessed("wati", eventId)) {
        return res.json(successResponse({ duplicate: true }));
      }
      const ingest = await webhookIngestService.ingestWati(req.body);
      await markWebhookProcessed("wati", eventId, req.body);
      return res.json(successResponse(ingest));
    } catch (error) {
      return next(error);
    }
  },

  async exotel(req, res, next) {
    try {
      await webhookIngestService.ingestExotel(req.body || {});
      return res.sendStatus(200);
    } catch (error) {
      return next(error);
    }
  }
};
