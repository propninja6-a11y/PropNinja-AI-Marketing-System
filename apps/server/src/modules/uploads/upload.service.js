import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";
import { uploadQueue } from "../../infrastructure/queue/queue.js";
import { metricsService } from "../../application/services/metricsService.js";
import { upsertProspect } from "../leads/dedup.service.js";
import { triggerCalling, triggerWhatsApp } from "./upload.triggers.js";
import { prioritizeLeads } from "./aiPrioritizer.js";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 19;
const MAX_BATCH_SIZE = 500;

const nextBusinessStartDelay = () => {
  const now = new Date();
  const hour = now.getHours();
  if (hour >= BUSINESS_START_HOUR && hour <= BUSINESS_END_HOUR) return 0;
  const next = new Date(now);
  if (hour > BUSINESS_END_HOUR) next.setDate(next.getDate() + 1);
  next.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
};

const computeDelayMs = (index, type) => {
  const baseDelay = 3000;
  let delay = baseDelay * index;
  if (type === "whatsapp") delay *= 2;
  delay += nextBusinessStartDelay();
  return delay;
};

const maybeCompleteUpload = async (uploadId) => {
  const { rows } = await pool.query(
    "SELECT total_rows, success_rows, failed_rows FROM uploads WHERE id = $1 LIMIT 1",
    [uploadId]
  );
  if (!rows.length) return;
  const upload = rows[0];
  if (Number(upload.success_rows) + Number(upload.failed_rows) >= Number(upload.total_rows)) {
    await pool.query("UPDATE uploads SET status = 'done' WHERE id = $1", [uploadId]);
  }
};

export const uploadService = {
  async enqueueBatch(leads, type, explicitCampaignName = null, filename = "upload.xlsx") {
    const trimmed = leads.slice(0, MAX_BATCH_SIZE);
    const prioritized = await prioritizeLeads(trimmed);
    const batchId = uuid();
    const campaignName = explicitCampaignName || prioritized[0]?.campaign || `${type} upload`;
    const { rows: uploadRows } = await pool.query(
      `INSERT INTO uploads (filename, type, campaign, total_rows, status)
       VALUES ($1, $2, $3, $4, 'processing')
       RETURNING id`,
      [filename, type, campaignName, prioritized.length]
    );
    const uploadId = uploadRows[0].id;

    await pool.query(
      "INSERT INTO upload_batches (id, upload_type, campaign_name, total_rows) VALUES ($1, $2, $3, $4)",
      [batchId, type, campaignName, prioritized.length]
    );

    for (let index = 0; index < prioritized.length; index += 1) {
      const lead = prioritized[index];
      await uploadQueue.add("process-lead", {
        batchId,
        uploadId,
        index,
        lead: {
          ...lead,
          source: type === "calling" ? "excel_calling" : "excel_whatsapp",
          campaign: lead.campaign || campaignName
        },
        type,
        campaign: lead.campaign || campaignName
      }, {
        delay: computeDelayMs(index, type)
      });
    }

    return { batchId, uploadId, totalRows: prioritized.length, status: "queued", campaignName };
  },

  async processImportRow(jobData) {
    const { lead, type, campaign } = jobData;
    if (!lead?.phone) return;

    const prospectId = await upsertProspect(lead);

    if (type === "calling") {
      await triggerCalling(prospectId, campaign);
      await metricsService.track("upload.calling.processed", 1, { campaign, prospectId });
      return;
    }

    await triggerWhatsApp(prospectId, campaign, lead.template);
    await metricsService.track("upload.whatsapp.processed", 1, { campaign, prospectId });
  },

  async markUploadRowSuccess(uploadId) {
    if (!uploadId) return;
    await pool.query("UPDATE uploads SET success_rows = success_rows + 1 WHERE id = $1", [uploadId]);
    await maybeCompleteUpload(uploadId);
  },

  async markUploadRowFailure({ uploadId, lead, type, campaign, error }) {
    await pool.query(
      `INSERT INTO upload_failures (upload_id, row_data, error, type, campaign)
       VALUES ($1, $2, $3, $4, $5)`,
      [uploadId || null, lead || {}, error?.message || String(error), type, campaign]
    );
    if (uploadId) {
      await pool.query("UPDATE uploads SET failed_rows = failed_rows + 1 WHERE id = $1", [uploadId]);
      await maybeCompleteUpload(uploadId);
    }
  },

  async storeValidationFailures(uploadId, failures, type, campaignName) {
    if (!failures?.length) return;
    for (const failure of failures) {
      await pool.query(
        `INSERT INTO upload_failures (upload_id, row_data, error, type, campaign, status)
         VALUES ($1, $2, $3, $4, $5, 'validation_failed')`,
        [uploadId, failure.rowData || {}, JSON.stringify(failure.error), type, campaignName]
      );
    }
    await pool.query("UPDATE uploads SET failed_rows = failed_rows + $2 WHERE id = $1", [uploadId, failures.length]);
    await maybeCompleteUpload(uploadId);
  },

  async retryFailed(limit = 100) {
    const { rows } = await pool.query(
      `SELECT id, row_data, type, campaign, retry_count, upload_id
       FROM upload_failures
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    for (const row of rows) {
      await uploadQueue.add("process-lead", {
        uploadId: row.upload_id,
        lead: row.row_data,
        type: row.type,
        campaign: row.campaign
      });
      await pool.query(
        `UPDATE upload_failures
         SET status = 'retried', retry_count = retry_count + 1
         WHERE id = $1`,
        [row.id]
      );
    }
    return { retried: rows.length };
  },

  async retryFailedById(id) {
    const { rows } = await pool.query(
      `SELECT id, row_data, type, campaign, upload_id
       FROM upload_failures
       WHERE id = $1 AND status = 'pending'
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return { retried: 0 };
    const row = rows[0];
    await uploadQueue.add("process-lead", {
      uploadId: row.upload_id,
      lead: row.row_data,
      type: row.type,
      campaign: row.campaign
    });
    await pool.query(
      `UPDATE upload_failures
       SET status = 'retried', retry_count = retry_count + 1
       WHERE id = $1`,
      [row.id]
    );
    return { retried: 1 };
  },

  async listUploads() {
    const { rows } = await pool.query(
      `SELECT id, filename, type, campaign, total_rows, success_rows, failed_rows, status, created_at
       FROM uploads
       ORDER BY created_at DESC`
    );
    return rows;
  },

  async listFailures(limit = 100) {
    const { rows } = await pool.query(
      `SELECT id, row_data, error, type, campaign, retry_count, status, created_at
       FROM upload_failures
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }
};
