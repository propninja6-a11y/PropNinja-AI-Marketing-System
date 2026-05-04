import { Router } from "express";
import { callsController } from "../controllers/calls.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { phoneRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("Admin", "Sales", "Manager"),
  phoneRateLimiter,
  callsController.create
);

export default router;
