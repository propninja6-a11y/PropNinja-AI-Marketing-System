import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { workflowQueue } from "../../infrastructure/queue/queue.js";
import { aiService } from "../ai/aiService.js";
import { metricsService } from "./metricsService.js";
import { assignmentService, resolveAssignmentStrategy } from "./assignmentService.js";
import { notificationService } from "./notificationService.js";
import { campaignService } from "./campaignService.js";

const STAGES = ["NEW", "CONTACTED", "INTERESTED", "SITE_VISIT", "CLOSED", "LOST"];

export const leadService = {
  async list() {
    const { rows } = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
    return rows;
  },

  async create(input) {
    const lead = {
      id: uuid(),
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || "manual",
      status: "new",
      location: input.location || null
    };
    const leadScoring = await aiService.scoreLead(input);

    await pool.query(
      `INSERT INTO leads (id, name, phone, email, source, status, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [lead.id, lead.name, lead.phone, lead.email, lead.source, lead.status, lead.location]
    );
    await metricsService.track("lead.created", 1, { leadId: lead.id, score: leadScoring.score });

    const trigger = leadScoring.score > 80 ? "LEAD_CREATED_HOT" : "LEAD_CREATED";
    const builder = await campaignService.getBuilderForTrigger(trigger);
    const campaignStrategyRaw = builder?.assignment_strategy;
    const resolvedStrategy = resolveAssignmentStrategy(campaignStrategyRaw);

    const assignment = await assignmentService.assignLead({
      leadId: lead.id,
      strategy: resolvedStrategy,
      strategyRequested: campaignStrategyRaw,
      lead: {
        name: lead.name,
        phone: lead.phone,
        location: lead.location,
        email: lead.email,
        source: lead.source
      }
    });
    if (assignment) {
      await metricsService.track("lead.assigned", 1, {
        leadId: lead.id,
        userId: assignment.userId,
        strategy: assignment.strategy
      });
    }

    await workflowQueue.add("lead-created", {
      trigger,
      payload: {
        leadId: lead.id,
        phone: lead.phone,
        name: lead.name,
        leadScore: leadScoring.score,
        leadTier: leadScoring.tier,
        location: lead.location
      }
    });

    if (leadScoring.score > 80) {
      await notificationService.notifyHotLead({ lead, assignment, score: leadScoring.score });
      await metricsService.track("lead.hot.notified", 1, { leadId: lead.id, score: leadScoring.score });
    }

    return { ...lead, leadScoring, assignment };
  },

  async updateStage({ id, stage, actor = null }) {
    if (!STAGES.includes(stage)) {
      throw new Error("Invalid lead stage");
    }

    const existing = await pool.query("SELECT * FROM leads WHERE id = $1 LIMIT 1", [id]);
    const current = existing.rows[0];
    if (!current) return null;
    if (current.stage === stage) return current;

    const updated = await pool.query(
      `UPDATE leads
       SET stage = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [stage, id]
    );

    await metricsService.track("lead.stage_changed", 1, {
      leadId: id,
      fromStage: current.stage || "NEW",
      toStage: stage,
      actorId: actor?.sub || null,
      actorRole: actor?.role || null
    });

    return updated.rows[0];
  }
};
