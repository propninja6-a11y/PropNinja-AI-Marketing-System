import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../infrastructure/db/postgres.js";
import { env } from "../../shared/env.js";

export const authService = {
  async login(email, password) {
    const { rows } = await pool.query("SELECT id, email, password_hash, role FROM users WHERE email = $1", [
      email
    ]);
    const user = rows[0];
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
      expiresIn: "12h"
    });
    const refreshToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
    return { token, refreshToken, role: user.role, email: user.email, expiresIn: "12h" };
  },

  refresh(refreshToken) {
    const payload = jwt.verify(refreshToken, env.JWT_SECRET);
    return jwt.sign({ sub: payload.sub }, env.JWT_SECRET, { expiresIn: "12h" });
  }
};
