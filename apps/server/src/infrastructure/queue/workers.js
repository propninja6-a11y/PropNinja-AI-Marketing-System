import { Worker } from "bullmq";
import { v4 as uuid } from "uuid";
import { deadLetterQueue, redis } from "./queue.js";
import { runWorkflow } from "../../application/workflowEngine.js";
import { logger } from "../../shared/logger.js";
import { pool } from "../db/postgres.js";
import { metricsService } from "../../application/services/metricsService.js";
import { uploadService } from "../../modules/uploads/upload.service.js";

let worker;
let importWorker;

export function startWorkers() {
  if (worker && importWorker) return;
  worker = new Worker(
    "workflow-jobs",
    async (job) => {
      logger.info(
        { jobId: job.id, trigger: job.data.trigger, simulation: job.data.simulation?.scenario },
        "workflow_trigger_received"
      );
      await runWorkflow(job.data.trigger, job.data.payload, job.data.simulation);
    },
    { connection: redis }
  );

  worker.on("failed", async (job, error) => {
    logger.error(
      { jobId: job?.id, attemptsMade: job?.attemptsMade, err: error?.message },
      "workflow_job_failed"
    );

    if (!job || job.attemptsMade < 3) return;

    await deadLetterQueue.add("workflow-dead-letter", {
      queue: "workflow-jobs",
      name: job.name,
      payload: job.data,
      reason: error?.message || "Unknown worker error",
      attempts: job.attemptsMade
    });

    await pool.query(
      `INSERT INTO failed_jobs (id, queue_name, job_name, payload, reason, attempts)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuid(),
        "workflow-jobs",
        job.name || "unknown",
        job.data || {},
        error?.message || "Unknown worker error",
        job.attemptsMade
      ]
    );

    await metricsService.track("workflow.failed", 1, {
      queue: "workflow-jobs",
      jobName: job.name,
      simulationRunId: job.data?.simulation?.runId
    });
  });

  worker.on("error", (error) => {
    logger.error({ err: error }, "workflow_worker_error");
  });

  importWorker = new Worker(
    "upload-processing",
    async (job) => {
      logger.info(
        { jobId: job.id, uploadType: job.data.type, campaign: job.data.campaign },
        "lead_import_job_received"
      );
      await uploadService.processImportRow(job.data);
      await uploadService.markUploadRowSuccess(job.data.uploadId);
    },
    { connection: redis }
  );

  importWorker.on("failed", async (job, error) => {
    logger.error(
      { jobId: job?.id, attemptsMade: job?.attemptsMade, err: error?.message },
      "lead_import_job_failed"
    );
    if (!job || job.attemptsMade < 3) return;
    await uploadService.markUploadRowFailure({
      uploadId: job.data?.uploadId,
      lead: job.data?.lead,
      type: job.data?.type,
      campaign: job.data?.campaign,
      error
    });
    await deadLetterQueue.add("lead-import-dead-letter", {
      queue: "upload-processing",
      name: job.name,
      payload: job.data,
      reason: error?.message || "Unknown import worker error",
      attempts: job.attemptsMade
    });
    await pool.query(
      `INSERT INTO failed_jobs (id, queue_name, job_name, payload, reason, attempts)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuid(), "upload-processing", job.name || "unknown", job.data || {}, error?.message || "error", job.attemptsMade]
    );
  });

  importWorker.on("error", (error) => {
    logger.error({ err: error }, "lead_import_worker_error");
  });

  logger.info("workflow_worker_started");
}

if (process.argv[1] && process.argv[1].endsWith("workers.js")) {
  startWorkers();
}
