import express from "express";
import {
  getMyNotifications,
  markNotificationRead,
  respondToInvitation,
  sendEventInvitation,
} from "../controllers/notificationController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyNotifications);
router.post("/invite", adminOnly, sendEventInvitation);
router.patch("/:id/read", markNotificationRead);
router.patch("/:id/respond", respondToInvitation);

export default router;
