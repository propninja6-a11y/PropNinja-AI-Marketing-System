import axios from "axios";
import { env } from "../../shared/env.js";
import { pool } from "../../infrastructure/db/postgres.js";
import { promoteProspectToLead } from "../services/prospectPromotionService.js";
import { assignmentService, resolveAssignmentStrategy } from "../services/assignmentService.js";
import { campaignService } from "../services/campaignService.js";
import { watiClient } from "../../infrastructure/integrations/watiClient.js";
import { metricsService } from "../services/metricsService.js";
import { logger } from "../../shared/logger.js";
import { v4 as uuid } from "uuid";

const openai = axios.create({
  baseURL: env.OPENAI_BASE_URL,
  headers: {
    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  }
});

/**
 * Phase 1: rule-based actions with optional OpenAI classification when keys exist.
 * `outcome`: interested | not_interested | unknown
 */
export async function runAIFlow({ leadId, prospectId, outcome, callSid, digits } = {}) {
  let resolvedLeadId = leadId || null;
  let ctx = { leadId: resolvedLeadId, prospectId: prospectId || null, outcome, callSid, digits };

  if (!resolvedLeadId && prospectId) {
    const { rows } = await pool.query(`SELECT promoted_lead_id FROM prospects WHERE id = $1`, [prospectId]);
    resolvedLeadId = rows[0]?.promoted_lead_id || null;
    ctx = { ...ctx, leadId: resolvedLeadId };
  }

  let refinedOutcome = outcome;
  if (env.OPENAI_API_KEY && (outcome === "unknown" || digits)) {
    try {
      const { data } = await openai.post("/chat/completions", {
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: `IVR call follow-up. DTMF digit(s): ${digits ?? "none"}. Raw outcome label: ${outcome}.
Return JSON only: {"outcome":"interested"|"not_interested"|"unknown"}.
Rules: 1 or first digit 1 => interested; 2 or first digit 2 => not_interested; empty => unknown.`
          }
        ]
      });
      const raw = data?.choices?.[0]?.message?.content?.trim();
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.outcome && ["interested", "not_interested", "unknown"].includes(parsed.outcome)) {
        refinedOutcome = parsed.outcome;
      }
    } catch (err) {
      logger.warn({ err: err.message }, "ai_decision_openai_skipped");
    }
  }

  ctx = { ...ctx, outcome: refinedOutcome };

  if (refinedOutcome === "interested") {
    if (!resolvedLeadId && prospectId) {
      const promoted = await promoteProspectToLead(prospectId, {
        signal: "exotel_ivr_interested",
        snippet: `DTMF ${digits || ""}`
      });
      resolvedLeadId = promoted?.leadId || null;
      ctx = { ...ctx, leadId: resolvedLeadId };
    }

    if (resolvedLeadId) {
      const { rows } = await pool.query(`SELECT * FROM leads WHERE id = $1 LIMIT 1`, [resolvedLeadId]);
      const lead = rows[0];
      if (lead) {
        const builder = await campaignService.getBuilderForTrigger("LEAD_CREATED");
        const rawStrategy = builder?.assignment_strategy;
        const strategy =
          typeof rawStrategy === "string" || Array.isArray(rawStrategy)
            ? resolveAssignmentStrategy(rawStrategy)
            : "round_robin";

        const { rows: existingAssign } = await pool.query(
          `SELECT id FROM lead_assignments WHERE lead_id = $1 LIMIT 1`,
          [resolvedLeadId]
        );
        if (!existingAssign.length) {
          await assignmentService.assignLead({
            leadId: resolvedLeadId,
            strategy,
            strategyRequested: builder?.assignment_strategy,
            lead: {
              name: lead.name,
              phone: lead.phone,
              location: lead.location,
              email: lead.email,
              source: lead.source
            }
          });
        }

        const message =
          "Thanks for your interest in PropNinja premium homes. Let’s book a site visit — reply with a convenient day or time, and our team will confirm.";
        await watiClient.sendMessage({ phone: lead.phone, message });
        await pool.query(
          `INSERT INTO whatsapp_messages (id, lead_id, prospect_id, direction, content, status)
           VALUES ($1,$2,$3,'outbound',$4,'sent')`,
          [uuid(), resolvedLeadId, prospectId || null, message]
        );
      }
    }

    await metricsService.track("exotel.ivr.interested", 1, {
      leadId: resolvedLeadId,
      prospectId: prospectId || null,
      callSid
    });
    logger.info({ ...ctx, refinedOutcome }, "ai_decision_interested");
    return ctx;
  }

  if (refinedOutcome === "not_interested") {
    if (resolvedLeadId) {
      await pool.query(
        `UPDATE leads SET status = 'cold', stage = 'LOST', ivr_outcome = $2, updated_at = NOW() WHERE id = $1`,
        [resolvedLeadId, refinedOutcome]
      );
    } else if (prospectId) {
      await pool.query(
        `UPDATE prospects SET outreach_status = 'not_interested', updated_at = NOW() WHERE id = $1`,
        [prospectId]
      );
    }

    await metricsService.track("exotel.ivr.not_interested", 1, {
      leadId: resolvedLeadId,
      prospectId: prospectId || null,
      callSid
    });
    logger.info({ ...ctx, refinedOutcome }, "ai_decision_not_interested");
    return ctx;
  }

  await metricsService.track("exotel.ivr.unknown", 1, {
    leadId: resolvedLeadId,
    prospectId: prospectId || null,
    callSid
  });
  logger.info({ ...ctx, refinedOutcome }, "ai_decision_unknown");
  return ctx;
}
