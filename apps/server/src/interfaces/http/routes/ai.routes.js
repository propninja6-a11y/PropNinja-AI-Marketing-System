import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/score", authenticate, authorize("Admin", "Sales", "Manager"), aiController.score);
router.post(
  "/call-script",
  authenticate,
  authorize("Admin", "Sales", "Manager"),
  aiController.callScript
);
router.post(
  "/whatsapp-personalize",
  authenticate,
  authorize("Admin", "Sales", "Manager"),
  aiController.personalizeWhatsapp
);

export default router;
