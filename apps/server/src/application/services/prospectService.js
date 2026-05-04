import { pool } from "../../infrastructure/db/postgres.js";

export const prospectService = {
  async list({ filter = "open" } = {}) {
    const showAll = filter === "all";
    const sql = showAll
      ? `SELECT id, name, phone, email, location, campaign, source, outreach_status,
                promoted_lead_id, promoted_at, created_at, updated_at
         FROM prospects
         ORDER BY created_at DESC
         LIMIT 500`
      : `SELECT id, name, phone, email, location, campaign, source, outreach_status,
                promoted_lead_id, promoted_at, created_at, updated_at
         FROM prospects
         WHERE promoted_lead_id IS NULL
         ORDER BY created_at DESC
         LIMIT 500`;

    const { rows } = await pool.query(sql);
    return rows;
  }
};
