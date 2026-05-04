import { z } from "zod";
import { leadService } from "../../../application/services/leadService.js";
import { successResponse, errorResponse } from "../../../shared/response.js";

const createLeadSchema = z.object({
  name: z.string(),
  phone: z.string().min(10),
  source: z.string().optional(),
  email: z.string().email().optional(),
  budget: z.number().optional(),
  location: z.string().optional()
});

const leadStageSchema = z.object({
  stage: z.enum(["NEW", "CONTACTED", "INTERESTED", "SITE_VISIT", "CLOSED", "LOST"])
});

export const leadsController = {
  async list(_req, res, next) {
    try {
      const leads = await leadService.list();
      return res.json(successResponse(leads));
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const parsed = createLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid lead payload", parsed.error.flatten()));
      }
      const lead = await leadService.create(parsed.data);
      return res.status(201).json(successResponse(lead));
    } catch (error) {
      return next(error);
    }
  },

  async updateStage(req, res, next) {
    try {
      const parsed = leadStageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid stage payload", parsed.error.flatten()));
      }
      const lead = await leadService.updateStage({
        id: req.params.id,
        stage: parsed.data.stage,
        actor: req.user
      });
      if (!lead) {
        return res.status(404).json(errorResponse("Lead not found"));
      }
      return res.json(successResponse(lead));
    } catch (error) {
      return next(error);
    }
  }
};
