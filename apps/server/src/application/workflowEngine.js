import { callService } from "./services/callService.js";
import { whatsappService } from "./services/whatsappService.js";
import { logger } from "../shared/logger.js";
import { pool } from "../infrastructure/db/postgres.js";
import { metricsService } from "./services/metricsService.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const evaluateCondition = (check, payload) => {
  if (!check || typeof check !== "string") return true;
  const match = check.match(/^lead_score\s*>\s*(\d+)$/);
  if (!match) return true;
  const threshold = Number(match[1]);
  return Number(payload?.leadScore || 0) > threshold;
};

const buildContext = (payload, simulation) => ({
  ...payload,
  simulation: simulation ?? payload.simulation
});

export async function runWorkflow(trigger, payload, simulation = null) {
  const ctx = buildContext(payload, simulation);

  const { rows } = await pool.query(
    `SELECT steps FROM workflow_definitions
     WHERE trigger_event = $1 AND is_active = TRUE
     LIMIT 1`,
    [trigger]
  );

  let steps = rows[0]?.steps || [];

  if (simulation?.scenario === "partial_failure") {
    steps = [
      { type: "whatsapp", template: "intro" },
      { type: "call" },
      { type: "whatsapp", template: "followup" }
    ];
  }
  if (!steps.length) {
    if (trigger === "WHATSAPP_TEMPLATE_SEND") {
      steps = [{ type: "whatsapp", template: payload.template || "intro" }];
    }
    if (trigger === "WHATSAPP_NO_RESPONSE") {
      steps = [{ type: "call" }];
    }
  }

  logger.info({ trigger, stepCount: steps.length, simulation: simulation?.scenario }, "workflow_trigger_executing");

  for (const step of steps) {
    try {
      if (step.type === "whatsapp") {
        if (step.template === "followup") {
          await whatsappService.sendFollowUp(ctx);
        } else {
          await whatsappService.sendWelcome(ctx);
        }
        continue;
      }

      if (step.type === "call") {
        await callService.startCall(ctx);
        continue;
      }

      if (step.type === "condition") {
        const passed = evaluateCondition(step.check, ctx);
        if (!passed) break;
        continue;
      }

      if (step.type === "delay") {
        await sleep(Number(step.value || 0) * 1000);
      }
    } catch (error) {
      if (simulation?.scenario === "partial_failure" && step.type === "call") {
        logger.warn({ err: error.message, step: step.type }, "workflow_simulation_partial_failure_continue");
        await metricsService.track("workflow.simulation.step_failed", 1, {
          step: "call",
          simulationRunId: simulation?.runId,
          reason: error.message
        });
        continue;
      }
      throw error;
    }
  }

  if (simulation?.runId) {
    await metricsService.track("workflow.simulation.completed", 1, {
      simulationRunId: simulation.runId,
      scenario: simulation.scenario
    });
  }
}
