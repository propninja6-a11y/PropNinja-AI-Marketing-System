import { v4 as uuid } from "uuid";
import { workflowQueue } from "../../infrastructure/queue/queue.js";
import { pool } from "../../infrastructure/db/postgres.js";
import { runWorkflow } from "../workflowEngine.js";
import { webhookIngestService } from "../services/webhookIngestService.js";
import { logger } from "../../shared/logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCENARIOS = new Set([
  "wati_down",
  "vapi_delay",
  "duplicate_webhook",
  "high_load",
  "partial_failure"
]);

async function pollFailedJobByRunId(runId, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await pool.query(
      `SELECT attempts, reason, payload
       FROM failed_jobs
       WHERE payload->'simulation'->>'runId' = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [runId]
    );
    if (rows.length) return rows[0];
    await sleep(400);
  }
  return null;
}

async function waitForJobCompletion(runId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { rows } = await pool.query(
      `SELECT 1 FROM metrics_events
       WHERE event_type = 'workflow.simulation.completed'
         AND metadata->>'simulationRunId' = $1
       LIMIT 1`,
      [runId]
    );
    if (rows.length) return true;
    await sleep(300);
  }
  return false;
}

function buildLeadPayload(lead) {
  const leadId = lead.leadId || uuid();
  const budget = Number(lead.budget || 0);
  let leadScore = 50;
  let leadTier = "WARM";
  if (budget >= 15000000) {
    leadScore = 92;
    leadTier = "HOT";
  } else if (budget >= 8000000) {
    leadScore = 72;
    leadTier = "WARM";
  } else {
    leadScore = 45;
    leadTier = "COLD";
  }

  return {
    leadId,
    phone: lead.phone || "9999999999",
    name: lead.name || "Simulation Lead",
    leadScore,
    leadTier
  };
}

async function runWatiDown(lead) {
  const runId = uuid();
  const payload = buildLeadPayload(lead);
  const simulation = { scenario: "wati_down", runId };

  await workflowQueue.add(
    "simulation-wati-down",
    {
      trigger: "LEAD_CREATED",
      payload: { ...payload, simulation },
      simulation
    },
    { jobId: `sim-${runId}` }
  );

  const failed = await pollFailedJobByRunId(runId);
  const dlq = Boolean(failed);
  const attempts = failed?.attempts ?? 0;

  return {
    scenario: "wati_down",
    result: {
      whatsapp: "failed",
      retries: attempts,
      dlq,
      call_triggered: false,
      failure_reason: failed?.reason || null,
      runId,
      timed_out: !failed
    },
    notes: failed
      ? "Job exhausted retries and was recorded for DLQ tracking."
      : "No failed_jobs row yet; ensure Redis is up and a worker is running."
  };
}

async function runVapiDelay(lead, options = {}) {
  const runId = uuid();
  const payload = buildLeadPayload(lead);
  const simulation = {
    scenario: "vapi_delay",
    runId,
    delayMs: options.delayMs ?? 2500
  };

  const started = Date.now();
  await workflowQueue.add(
    "simulation-vapi-delay",
    {
      trigger: "LEAD_CREATED_HOT",
      payload: { ...payload, simulation },
      simulation
    },
    { jobId: `sim-${runId}` }
  );

  const completed = await waitForJobCompletion(runId, options.waitMs ?? 25000);
  const durationMs = Date.now() - started;

  const { rows: callRows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM metrics_events
     WHERE event_type = 'call.triggered'
       AND metadata->>'simulationRunId' = $1`,
    [runId]
  );
  const callCount = callRows[0]?.c ?? 0;

  return {
    scenario: "vapi_delay",
    result: {
      whatsapp: "skipped_or_sent",
      call_triggered: callCount >= 1,
      duplicate_call_prevented: callCount <= 1,
      call_invocations: callCount,
      queue_completed_observed: completed,
      duration_ms: durationMs,
      runId
    },
    notes: completed
      ? "Worker reported completion via metrics marker."
      : "Timeout waiting for completion; start Redis + worker if testing end-to-end."
  };
}

async function runDuplicateWebhook(lead) {
  const runId = uuid();
  const payload = buildLeadPayload(lead);
  const eventId = `sim-vapi-${runId}`;
  const body = {
    eventId,
    status: "completed",
    metadata: { leadId: payload.leadId, phone: payload.phone }
  };

  let wrapAddCalls = 0;
  const realAdd = workflowQueue.add.bind(workflowQueue);
  workflowQueue.add = async (...args) => {
    wrapAddCalls += 1;
    return realAdd(...args);
  };

  try {
    const first = await webhookIngestService.ingestVapi(body);
    const second = await webhookIngestService.ingestVapi(body);
    return {
      scenario: "duplicate_webhook",
      result: {
        first_duplicate: first.duplicate,
        second_duplicate: second.duplicate,
        workflow_enqueues: (first.enqueued ? 1 : 0) + (second.enqueued ? 1 : 0),
        observed_queue_add_calls: wrapAddCalls,
        idempotency_ok: first.enqueued === true && second.duplicate === true && wrapAddCalls === 1,
        runId
      }
    };
  } finally {
    workflowQueue.add = realAdd;
  }
}

async function runHighLoad(lead, options = {}) {
  const runId = uuid();
  const count = Math.min(100, Math.max(1, Number(options.count || 50)));
  const basePayload = buildLeadPayload(lead);
  const started = Date.now();

  for (let i = 0; i < count; i += 1) {
    const simulation = { scenario: "high_load", runId, index: i };
    await workflowQueue.add("simulation-high-load", {
      trigger: "LEAD_CREATED",
      payload: { ...basePayload, leadId: uuid(), simulation },
      simulation
    });
  }

  const durationMs = Date.now() - started;
  return {
    scenario: "high_load",
    result: {
      jobs_enqueued: count,
      enqueue_duration_ms: durationMs,
      jobs_per_second: Number((count / (durationMs / 1000 || 1)).toFixed(2)),
      runId
    },
    notes: "Jobs are no-ops for external APIs when simulation.scenario is high_load; measures enqueue throughput."
  };
}

async function runPartialFailure(lead) {
  const runId = uuid();
  const payload = buildLeadPayload(lead);
  const simulation = { scenario: "partial_failure", runId };

  await runWorkflow("LEAD_CREATED", { ...payload, simulation }, simulation);

  const { rows: wa } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM metrics_events
     WHERE event_type = 'whatsapp.sent'
       AND metadata->>'simulationRunId' = $1`,
    [runId]
  );
  const { rows: calls } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM metrics_events
     WHERE event_type = 'call.triggered'
       AND metadata->>'simulationRunId' = $1`,
    [runId]
  );
  const { rows: failedCall } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM metrics_events
     WHERE event_type = 'call.simulated_failure'
       AND metadata->>'simulationRunId' = $1`,
    [runId]
  );

  return {
    scenario: "partial_failure",
    result: {
      whatsapp: "simulated_ok",
      whatsapp_steps_completed: wa[0]?.c ?? 0,
      call_triggered: (calls[0]?.c ?? 0) >= 1,
      call_failed: (failedCall[0]?.c ?? 0) >= 1,
      retries: 0,
      dlq: false,
      fallback_nurture_sent: (wa[0]?.c ?? 0) >= 2,
      runId
    },
    notes: "Runs inline workflow with call failure and follow-up WhatsApp for nurture path."
  };
}

export async function runWorkflowSimulation(input) {
  const scenario = input.scenario;
  if (!SCENARIOS.has(scenario)) {
    const err = new Error(`Unknown scenario: ${scenario}`);
    err.status = 400;
    throw err;
  }

  const lead = input.lead || {};
  logger.info({ scenario, runId: "pending" }, "workflow_simulation_started");

  switch (scenario) {
    case "wati_down":
      return runWatiDown(lead);
    case "vapi_delay":
      return runVapiDelay(lead, input);
    case "duplicate_webhook":
      return runDuplicateWebhook(lead);
    case "high_load":
      return runHighLoad(lead, input);
    case "partial_failure":
      return runPartialFailure(lead);
    default:
      return null;
  }
}

export { SCENARIOS };
