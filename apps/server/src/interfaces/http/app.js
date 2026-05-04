import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import crypto from "node:crypto";
import { logger } from "../../shared/logger.js";
import { successResponse, errorResponse } from "../../shared/response.js";
import leadsRoutes from "./routes/leads.routes.js";
import campaignsRoutes from "./routes/campaigns.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";
import callsRoutes from "./routes/calls.routes.js";
import authRoutes from "./routes/auth.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import metricsRoutes from "./routes/metrics.routes.js";
import workflowsRoutes from "./routes/workflows.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import prospectsRoutes from "./routes/prospects.routes.js";
import { ipRateLimiter } from "./middleware/rateLimit.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),
      customProps: (req) => ({ requestId: req.id })
    })
  );
  app.use((req, _res, next) => {
    req.log.info({ method: req.method, path: req.path }, "api_call_received");
    next();
  });
  app.use(ipRateLimiter);

  app.get("/health", (_req, res) =>
    res.json(successResponse({ service: "PropNinja AI Marketing System" }))
  );

  app.use("/api/leads", leadsRoutes);
  app.use("/api/prospects", prospectsRoutes);
  app.use("/api/campaigns", campaignsRoutes);
  app.use("/api/whatsapp", whatsappRoutes);
  app.use("/api/calls", callsRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/webhooks", webhooksRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/workflows", workflowsRoutes);
  app.use("/api/uploads", uploadsRoutes);
  app.use("/api/admin", adminRoutes);

  app.use((err, _req, res, _next) => {
    logger.error({ err }, "api_failure");
    if (err?.code) {
      return res.status(500).json(errorResponse("Internal server error", err.code));
    }
    res.status(500).json(errorResponse(err.message || "Internal server error"));
  });

  return app;
}
