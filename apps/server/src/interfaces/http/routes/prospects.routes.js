import { Router } from "express";
import { prospectsController } from "../controllers/prospects.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("Admin", "Manager", "Sales"), prospectsController.list);

export default router;
