import { pool } from "../../infrastructure/db/postgres.js";

export const adminSettingsService = {
  async getAll() {
    const { rows } = await pool.query("SELECT key, value, updated_at, updated_by FROM admin_settings ORDER BY key ASC");
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async setMany(settings, actorId = null) {
    const entries = Object.entries(settings || {});
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO admin_settings (key, value, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
        [key, JSON.stringify(value), actorId]
      );
    }
    return this.getAll();
  }
};
