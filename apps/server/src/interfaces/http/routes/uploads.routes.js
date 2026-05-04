import { Router } from "express";
import multer from "multer";
import { uploadController } from "../../../modules/uploads/upload.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadRateLimiter = createRateLimiter({
  prefix: "upload",
  windowMs: 60_000,
  max: 20,
  keyBuilder: (req) => req.user?.sub || req.ip || "unknown",
  errorMessage: "Too many upload requests"
});

router.post(
  "/calling",
  authenticate,
  authorize("Admin", "Manager"),
  uploadRateLimiter,
  upload.single("file"),
  uploadController.calling
);
router.post(
  "/whatsapp",
  authenticate,
  authorize("Admin", "Manager"),
  uploadRateLimiter,
  upload.single("file"),
  uploadController.whatsapp
);
router.post("/retry-failed", authenticate, authorize("Admin", "Manager"), uploadController.retryFailed);
router.post("/retry-failed/:id", authenticate, authorize("Admin", "Manager"), uploadController.retryFailedById);
router.get("/", authenticate, authorize("Admin", "Manager"), uploadController.list);
router.get("/failed", authenticate, authorize("Admin", "Manager"), uploadController.listFailed);

export default router;
