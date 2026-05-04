import { v4 as uuid } from "uuid";
import { pool } from "../../infrastructure/db/postgres.js";

export const adminNotificationsService = {
  async list(status = "open") {
    const { rows } = await pool.query(
      `SELECT id, type, title, message, severity, status, metadata, created_at, ack_by, ack_at
       FROM admin_notifications
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC
       LIMIT 200`,
      [status]
    );
    return rows;
  },

  async create({ type, title, message, severity = "info", metadata = {} }) {
    const id = uuid();
    const { rows } = await pool.query(
      `INSERT INTO admin_notifications (id, type, title, message, severity, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, type, title, message, severity, JSON.stringify(metadata)]
    );
    return rows[0];
  },

  async acknowledge(id, userId) {
    const { rows } = await pool.query(
      `UPDATE admin_notifications
       SET status = 'acknowledged', ack_by = $2, ack_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId]
    );
    return rows[0] || null;
  }
};
