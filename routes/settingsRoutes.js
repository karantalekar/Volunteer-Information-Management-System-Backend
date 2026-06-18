import express from "express";
import {
  getSettings,
  updateGeneralSettings,
} from "../controllers/settingsController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getSettings);
router.put("/general", updateGeneralSettings);

export default router;
