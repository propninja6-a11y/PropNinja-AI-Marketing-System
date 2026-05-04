import { z } from "zod";
import { runWorkflowSimulation, SCENARIOS } from "../../../application/simulator/workflowSimulator.js";
import { errorResponse, successResponse } from "../../../shared/response.js";

const leadShape = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    budget: z.number().optional(),
    leadId: z.string().uuid().optional()
  })
  .optional();

const simulateSchema = z.object({
  scenario: z.enum([...SCENARIOS]),
  lead: leadShape,
  count: z.number().int().min(1).max(100).optional(),
  delayMs: z.number().positive().optional(),
  waitMs: z.number().positive().optional()
});

export const workflowsController = {
  async simulate(req, res, next) {
    try {
      const parsed = simulateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid simulation payload", parsed.error.flatten()));
      }

      const report = await runWorkflowSimulation(parsed.data);
      return res.status(200).json(successResponse(report));
    } catch (error) {
      if (error.status === 400) {
        return res.status(400).json(errorResponse(error.message));
      }
      return next(error);
    }
  }
};
