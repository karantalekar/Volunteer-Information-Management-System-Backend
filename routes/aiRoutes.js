import express from "express";
import {
  chatAssistant,
  generateEventDescription,
  matchVolunteersToEvent,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/generate-description", generateEventDescription);
router.post("/match-volunteers", matchVolunteersToEvent);
router.post("/chat", chatAssistant);

export default router;
