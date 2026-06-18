import express from "express";
import {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  enrollVolunteer,
  unenrollVolunteer,
} from "../controllers/eventController.js";

import {
  protect,
  adminOnly,
  activeVolunteerOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllEvents);
router.get("/:id", getEvent);

router.use(protect);

router.route("/").post(adminOnly, createEvent);

router.route("/:id").put(adminOnly, updateEvent).delete(adminOnly, deleteEvent);

router.post("/:id/enroll", activeVolunteerOrAdmin, enrollVolunteer);
router.delete("/:id/unenroll", activeVolunteerOrAdmin, unenrollVolunteer);

export default router;
