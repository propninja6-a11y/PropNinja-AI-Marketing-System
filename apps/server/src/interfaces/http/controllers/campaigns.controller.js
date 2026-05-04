import { z } from "zod";
import { campaignService } from "../../../application/services/campaignService.js";
import { successResponse, errorResponse } from "../../../shared/response.js";

const createCampaignSchema = z.object({
  name: z.string().min(2),
  channel: z.string().min(2),
  status: z.enum(["draft", "active"]).optional(),
  triggerEvent: z.string().optional()
});

const updateCampaignSchema = createCampaignSchema.partial();

const strategyKey = z.enum(["round_robin", "least_loaded", "territory"]);

const createBuilderSchema = z.object({
  name: z.string().min(2),
  trigger: z.string().min(3),
  steps: z.array(z.record(z.any())).min(1),
  status: z.enum(["active", "inactive"]).optional(),
  assignment_strategy: z.union([strategyKey, z.array(strategyKey).min(1)]).optional()
});

const updateBuilderSchema = createBuilderSchema.partial();

export const campaignsController = {
  async list(_req, res, next) {
    try {
      const campaigns = await campaignService.list();
      return res.json(successResponse(campaigns));
    } catch (error) {
      return next(error);
    }
  },

  async create(req, res, next) {
    try {
      const parsed = createCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid campaign payload", parsed.error.flatten()));
      }
      const campaign = await campaignService.create(parsed.data);
      return res.status(201).json(successResponse(campaign));
    } catch (error) {
      return next(error);
    }
  },

  async update(req, res, next) {
    try {
      const parsed = updateCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid campaign payload", parsed.error.flatten()));
      }
      const campaign = await campaignService.update(req.params.id, parsed.data);
      if (!campaign) return res.status(404).json(errorResponse("Campaign not found"));
      return res.json(successResponse(campaign));
    } catch (error) {
      return next(error);
    }
  },

  async remove(req, res, next) {
    try {
      const ok = await campaignService.remove(req.params.id);
      if (!ok) return res.status(404).json(errorResponse("Campaign not found"));
      return res.json(successResponse({ deleted: true }));
    } catch (error) {
      return next(error);
    }
  },

  async listBuilders(_req, res, next) {
    try {
      const campaigns = await campaignService.listBuilders();
      return res.json(successResponse(campaigns));
    } catch (error) {
      return next(error);
    }
  },

  async createBuilder(req, res, next) {
    try {
      const parsed = createBuilderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid campaign builder payload", parsed.error.flatten()));
      }
      const campaign = await campaignService.createBuilder(parsed.data);
      return res.status(201).json(successResponse(campaign));
    } catch (error) {
      return next(error);
    }
  },

  async updateBuilder(req, res, next) {
    try {
      const parsed = updateBuilderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid campaign builder payload", parsed.error.flatten()));
      }
      const builder = await campaignService.updateBuilder(req.params.id, parsed.data);
      if (!builder) return res.status(404).json(errorResponse("Campaign builder not found"));
      return res.json(successResponse(builder));
    } catch (error) {
      return next(error);
    }
  },

  async removeBuilder(req, res, next) {
    try {
      const ok = await campaignService.removeBuilder(req.params.id);
      if (!ok) return res.status(404).json(errorResponse("Campaign builder not found"));
      return res.json(successResponse({ deleted: true }));
    } catch (error) {
      return next(error);
    }
  },

  async compare(_req, res, next) {
    try {
      const result = await campaignService.compare();
      return res.json(successResponse(result));
    } catch (error) {
      return next(error);
    }
  },

  async performance(_req, res, next) {
    try {
      const result = await campaignService.performance();
      return res.json(successResponse(result));
    } catch (error) {
      return next(error);
    }
  }
};
