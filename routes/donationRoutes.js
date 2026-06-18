import express from "express";
import {
  getAllDonations,
  getDonation,
  createDonationOrder,
  verifyDonationPayment,
  createDonation,
} from "../controllers/donationController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route for creating payment order
router.post("/create-order", createDonationOrder);
router.post("/verify", verifyDonationPayment);
router.post("/", createDonation);

// Protected routes
router.use(protect);

router.route("/").get(adminOnly, getAllDonations);
router.route("/:id").get(getDonation);

export default router;
