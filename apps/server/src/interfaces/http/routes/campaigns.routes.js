import { Router } from "express";
import { campaignsController } from "../controllers/campaigns.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("Admin", "Manager"), campaignsController.list);
router.get("/compare", authenticate, authorize("Admin", "Manager"), campaignsController.compare);
router.get("/performance", authenticate, authorize("Admin", "Manager"), campaignsController.performance);
router.post("/", authenticate, authorize("Admin", "Manager"), campaignsController.create);
router.patch("/:id", authenticate, authorize("Admin", "Manager"), campaignsController.update);
router.delete("/:id", authenticate, authorize("Admin", "Manager"), campaignsController.remove);
router.get("/builder", authenticate, authorize("Admin", "Manager"), campaignsController.listBuilders);
router.post("/builder", authenticate, authorize("Admin", "Manager"), campaignsController.createBuilder);
router.patch("/builder/:id", authenticate, authorize("Admin", "Manager"), campaignsController.updateBuilder);
router.delete("/builder/:id", authenticate, authorize("Admin", "Manager"), campaignsController.removeBuilder);

export default router;
