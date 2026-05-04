import { Router } from "express";
import { workflowsController } from "../controllers/workflows.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/simulate", authenticate, authorize("Admin"), workflowsController.simulate);

export default router;
