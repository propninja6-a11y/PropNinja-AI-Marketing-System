import { metricsService } from "../../../application/services/metricsService.js";
import { successResponse } from "../../../shared/response.js";
import { slaService } from "../../../application/services/slaService.js";

export const metricsController = {
  async summary(_req, res, next) {
    try {
      const data = await metricsService.summary();
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async conversion(_req, res, next) {
    try {
      const data = await metricsService.conversion();
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async sla(_req, res, next) {
    try {
      const data = await slaService.getSlaMetrics();
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  }
};
