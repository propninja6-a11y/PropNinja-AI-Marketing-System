import crypto from "node:crypto";
import { env } from "../../../shared/env.js";
import { isWebhookEventProcessed, markWebhookEventProcessed } from "../../../infrastructure/webhooks/webhookEvents.js";

export const verifyWebhookSignature = (provider) => (req, res, next) => {
  const signature = req.headers["x-signature"] || req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body || {});
  const expected = crypto.createHmac("sha256", env.WEBHOOK_SECRET).update(payload).digest("hex");

  if (!signature || signature !== expected) {
    return res.status(401).json({
      success: false,
      data: {},
      error: { message: `Invalid ${provider} webhook signature`, details: null }
    });
  }

  next();
};

export const isAlreadyProcessed = (provider, eventId) => isWebhookEventProcessed(provider, eventId);

export const markWebhookProcessed = (provider, eventId, payload) =>
  markWebhookEventProcessed(provider, eventId, payload);
