import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/summary", authenticate, authorize("Admin", "Manager"), metricsController.summary);
router.get("/conversion", authenticate, authorize("Admin", "Manager"), metricsController.conversion);
router.get("/sla", authenticate, authorize("Admin", "Manager"), metricsController.sla);

export default router;
