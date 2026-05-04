import { Router } from "express";
import { leadsController } from "../controllers/leads.controller.js";
import { phoneRateLimiter } from "../middleware/rateLimit.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("Admin", "Manager", "Sales"), leadsController.list);
router.post("/", authenticate, authorize("Admin", "Manager", "Sales"), phoneRateLimiter, leadsController.create);
router.patch("/:id/stage", authenticate, authorize("Admin", "Manager", "Sales"), leadsController.updateStage);

export default router;
