import { z } from "zod";
import { successResponse, errorResponse } from "../../../shared/response.js";
import { adminSettingsService } from "../../../application/services/adminSettingsService.js";
import { adminNotificationsService } from "../../../application/services/adminNotificationsService.js";
import { adminUsersService } from "../../../application/services/adminUsersService.js";

const settingsSchema = z.record(z.any());
const notificationSchema = z.object({
  type: z.string().min(2),
  title: z.string().min(2),
  message: z.string().min(2),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  metadata: z.record(z.any()).optional()
});
const updateUserSchema = z.object({
  role: z.enum(["Admin", "Manager", "Sales"]).optional(),
  territory: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export const adminController = {
  async getSettings(_req, res, next) {
    try {
      const data = await adminSettingsService.getAll();
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async upsertSettings(req, res, next) {
    try {
      const parsed = settingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid settings payload", parsed.error.flatten()));
      }
      const data = await adminSettingsService.setMany(parsed.data, req.user?.sub || null);
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async listNotifications(req, res, next) {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : null;
      const data = await adminNotificationsService.list(status);
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async createNotification(req, res, next) {
    try {
      const parsed = notificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid notification payload", parsed.error.flatten()));
      }
      const data = await adminNotificationsService.create(parsed.data);
      return res.status(201).json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async ackNotification(req, res, next) {
    try {
      const data = await adminNotificationsService.acknowledge(req.params.id, req.user?.sub || null);
      if (!data) return res.status(404).json(errorResponse("Notification not found"));
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async listUsers(req, res, next) {
    try {
      const role = typeof req.query.role === "string" ? req.query.role : null;
      const data = await adminUsersService.list(role);
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  },

  async updateUser(req, res, next) {
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json(errorResponse("Invalid user update payload", parsed.error.flatten()));
      }
      const data = await adminUsersService.update(req.params.id, parsed.data);
      if (!data) return res.status(404).json(errorResponse("User not found"));
      return res.json(successResponse(data));
    } catch (error) {
      return next(error);
    }
  }
};
