import express, { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller.js";
import { verifyWebhookSignature } from "../middleware/webhookSecurity.js";

const router = Router();

router.post("/vapi", verifyWebhookSignature("vapi"), webhooksController.vapi);
router.post("/wati", verifyWebhookSignature("wati"), webhooksController.wati);
router.post("/exotel", express.urlencoded({ extended: true }), webhooksController.exotel);

export default router;
