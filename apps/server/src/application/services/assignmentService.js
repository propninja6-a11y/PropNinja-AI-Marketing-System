import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { metricsService } from "./metricsService.js";
import { leastLoaded, roundRobin, territory } from "../assignment/strategies/index.js";
import { env } from "../../shared/env.js";

const strategies = {
  round_robin: roundRobin,
  least_loaded: leastLoaded,
  territory
};

function normalizeStrategyKey(raw) {
  if (raw == null) return "round_robin";
  const s = String(raw).trim();
  if (s === "leastLoaded" || s === "least-loaded") return "least_loaded";
  if (s === "roundRobin" || s === "round-robin") return "round_robin";
  return s;
}

function pickStrategyFromCampaign(raw) {
  if (raw == null) return "round_robin";
  if (Array.isArray(raw)) {
    const choices = raw.map(normalizeStrategyKey).filter((k) => strategies[k]);
    if (!choices.length) return "round_robin";
    return choices[Math.floor(Math.random() * choices.length)];
  }
  const key = normalizeStrategyKey(raw);
  return strategies[key] ? key : "round_robin";
}

/** Resolves campaign `assignment_strategy` (string, enum, or A/B array) to a single strategy key. */
export function resolveAssignmentStrategy(raw) {
  return pickStrategyFromCampaign(raw);
}

function formatRequestedForMetrics(raw) {
  if (raw === undefined || raw === null) return "round_robin";
  if (Array.isArray(raw)) return JSON.stringify(raw);
  return String(raw);
}

export const assignmentService = {
  /**
   * @param {{ leadId: string, strategy?: string, lead: Record<string, unknown>, strategyRequested?: string }} params
   */
  async assignLead({ leadId, strategy = "round_robin", lead, strategyRequested }) {
    const requestedLabel = formatRequestedForMetrics(
      strategyRequested !== undefined ? strategyRequested : strategy
    );

    const { rows: salesUsers } = await pool.query(
      `SELECT id, email, territory
       FROM users
       WHERE role = 'Sales' AND COALESCE(is_active, TRUE) = TRUE
       ORDER BY created_at ASC`
    );
    if (!salesUsers.length) return null;

    const normalizedKey = normalizeStrategyKey(strategy);
    let selected = strategies[normalizedKey] || roundRobin;

    const context = {
      pool,
      overloadThreshold:
        env.ASSIGNMENT_OVERLOAD_THRESHOLD != null
          ? Number(env.ASSIGNMENT_OVERLOAD_THRESHOLD)
          : null
    };

    const leadPayload = { id: leadId, ...lead };
    let appliedKey = normalizedKey;
    let userId = await selected.assign({ lead: leadPayload, users: salesUsers, context });
    let fallbackFrom = null;

    if (!userId && appliedKey !== "round_robin") {
      fallbackFrom = appliedKey;
      userId = await roundRobin.assign({ lead: leadPayload, users: salesUsers, context });
      appliedKey = "round_robin";
    }

    if (!userId) return null;

    const assignee = salesUsers.find((u) => u.id === userId);
    if (!assignee) return null;

    await pool.query(
      "INSERT INTO lead_assignments (id, lead_id, user_id, strategy) VALUES ($1, $2, $3, $4)",
      [uuid(), leadId, assignee.id, appliedKey]
    );

    await metricsService.track("assignment", 1, {
      event: "assignment",
      strategy: appliedKey,
      strategy_requested: requestedLabel,
      fallback_from: fallbackFrom,
      leadId,
      userId: assignee.id
    });

    return {
      leadId,
      userId: assignee.id,
      userEmail: assignee.email,
      strategy: appliedKey,
      strategyRequested: requestedLabel
    };
  }
};
