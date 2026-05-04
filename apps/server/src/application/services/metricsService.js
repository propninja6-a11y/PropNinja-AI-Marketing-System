import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";

export const metricsService = {
  async track(eventType, value = null, metadata = {}) {
    await pool.query(
      `INSERT INTO metrics_events (id, event_type, value, metadata)
       VALUES ($1, $2, $3, $4)`,
      [uuid(), eventType, value, JSON.stringify(metadata)]
    );
  },

  async summary() {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'call.triggered') AS calls_triggered,
        COUNT(*) FILTER (WHERE event_type = 'whatsapp.sent') AS whatsapp_sent,
        COUNT(*) FILTER (WHERE event_type = 'workflow.failed') AS failures,
        ROUND(
          (
            COUNT(*) FILTER (WHERE event_type = 'lead.converted')::numeric /
            NULLIF(COUNT(*) FILTER (WHERE event_type = 'lead.created'), 0)
          ) * 100, 2
        ) AS conversion_percentage
      FROM metrics_events
    `;
    const { rows } = await pool.query(query);
    return rows[0] || {};
  },

  async conversion() {
    const query = `
      WITH counts AS (
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'lead.created')::numeric AS leads,
          COUNT(*) FILTER (WHERE event_type = 'call.triggered')::numeric AS calls,
          COUNT(*) FILTER (WHERE event_type = 'call.interested')::numeric AS interested,
          COUNT(*) FILTER (WHERE event_type = 'lead.site_visit')::numeric AS site_visits
        FROM metrics_events
      )
      SELECT
        ROUND((calls / NULLIF(leads, 0)) * 100, 2) AS lead_to_call_percentage,
        ROUND((interested / NULLIF(calls, 0)) * 100, 2) AS call_to_interested_percentage,
        ROUND((site_visits / NULLIF(interested, 0)) * 100, 2) AS interested_to_site_visit_percentage
      FROM counts
    `;
    const { rows } = await pool.query(query);
    return rows[0] || {};
  }
};
