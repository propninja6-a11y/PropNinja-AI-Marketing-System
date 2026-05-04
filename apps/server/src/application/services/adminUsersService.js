import { pool } from "../../infrastructure/db/postgres.js";

export const adminUsersService = {
  async list(role = null) {
    const { rows } = await pool.query(
      `SELECT id, email, role, territory, is_active, created_at
       FROM users
       WHERE ($1::text IS NULL OR role = $1)
       ORDER BY created_at DESC`,
      [role]
    );
    return rows;
  },

  async update(id, input) {
    const { rows } = await pool.query(
      `UPDATE users
       SET role = COALESCE($2, role),
           territory = COALESCE($3, territory),
           is_active = COALESCE($4, is_active)
       WHERE id = $1
       RETURNING id, email, role, territory, is_active, created_at`,
      [id, input.role ?? null, input.territory ?? null, input.is_active ?? null]
    );
    return rows[0] || null;
  }
};
