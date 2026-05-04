import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authService } from "../../../application/services/authService.js";
import { pool } from "../../../infrastructure/db/postgres.js";
import { errorResponse, successResponse } from "../../../shared/response.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["Admin", "Sales", "Manager"]).default("Sales")
});

export const authController = {
  async register(req, res, next) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid registration payload", parsed.error.flatten()));
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);
      await pool.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [uuid(), parsed.data.email, passwordHash, parsed.data.role]
      );

      return res.status(201).json(successResponse({ email: parsed.data.email, role: parsed.data.role }));
    } catch (error) {
      return next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const result = await authService.login(email, password);
      if (!result) return res.status(401).json(errorResponse("Invalid credentials"));
      return res.json(successResponse(result));
    } catch (error) {
      return next(error);
    }
  },

  async refresh(req, res, next) {
    try {
      const token = req.body?.refreshToken;
      if (!token) return res.status(400).json(errorResponse("Missing refresh token"));
      const accessToken = authService.refresh(token);
      return res.json(successResponse({ token: accessToken, expiresIn: "12h" }));
    } catch (error) {
      return res.status(401).json(errorResponse("Invalid refresh token"));
    }
  }
};
