import { pool } from "../../infrastructure/db/postgres.js";
import { notificationService } from "./notificationService.js";
import { logger } from "../../shared/logger.js";

export const slaService = {
  async markContacted(leadId) {
    const { rows } = await pool.query(
      `UPDATE lead_assignments
       SET first_contact_at = NOW()
       WHERE lead_id = $1 AND first_contact_at IS NULL
       RETURNING user_id, EXTRACT(EPOCH FROM (NOW() - assigned_at)) AS response_seconds`,
      [leadId]
    );
    if (!rows.length) return null;

    const responseSeconds = Number(rows[0].response_seconds || 0);
    if (responseSeconds > 300) {
      try {
        await notificationService.notifySalesManager(
          `Slow response on hot lead. leadId=${leadId}, responseSeconds=${responseSeconds.toFixed(0)}`
        );
      } catch (error) {
        logger.warn({ err: error.message }, "sla_alert_notify_failed");
      }
    }
    return { userId: rows[0].user_id, responseSeconds };
  },

  async getSlaMetrics() {
    const { rows } = await pool.query(
      `SELECT
         user_id,
         AVG(EXTRACT(EPOCH FROM (first_contact_at - assigned_at))) AS avg_response_time
       FROM lead_assignments
       WHERE first_contact_at IS NOT NULL
       GROUP BY user_id`
    );
    return rows.map((r) => ({
      userId: r.user_id,
      avgResponseTimeSeconds: Number(r.avg_response_time || 0)
    }));
  }
};
