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

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getAllEvents).post(adminOnly, createEvent);

router
  .route("/:id")
  .get(getEvent)
  .put(adminOnly, updateEvent)
  .delete(adminOnly, deleteEvent);

router.post("/:id/enroll", enrollVolunteer);
router.delete("/:id/unenroll", unenrollVolunteer);

export default router;
