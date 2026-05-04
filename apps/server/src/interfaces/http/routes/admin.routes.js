import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { adminController } from "../controllers/admin.controller.js";

const router = Router();

router.get("/settings", authenticate, authorize("Admin"), adminController.getSettings);
router.put("/settings", authenticate, authorize("Admin"), adminController.upsertSettings);

router.get("/notifications", authenticate, authorize("Admin", "Manager"), adminController.listNotifications);
router.post("/notifications", authenticate, authorize("Admin", "Manager"), adminController.createNotification);
router.patch(
  "/notifications/:id/ack",
  authenticate,
  authorize("Admin", "Manager"),
  adminController.ackNotification
);

router.get("/users", authenticate, authorize("Admin", "Manager"), adminController.listUsers);
router.patch("/users/:id", authenticate, authorize("Admin"), adminController.updateUser);

export default router;
