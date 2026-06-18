import express from "express";
import {
  getAllVolunteers,
  getVolunteer,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  updateHours,
} from "../controllers/volunteerController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createVolunteer);

router.use(protect);

router.route("/").get(getAllVolunteers);

router
  .route("/:id")
  .get(getVolunteer)
  .put(updateVolunteer)
  .delete(adminOnly, deleteVolunteer);

router.patch("/:id/hours", adminOnly, updateHours);

export default router;
