import { Router } from "express";
import { whatsappController } from "../controllers/whatsapp.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { phoneRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post(
  "/send",
  authenticate,
  authorize("Admin", "Sales", "Manager"),
  phoneRateLimiter,
  whatsappController.send
);

export default router;
