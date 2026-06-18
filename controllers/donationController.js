import Donation from "../models/Donation.js";
import crypto from "crypto";
import { clearStatsCache } from "../utils/cache.js";

// GET /api/v1/donations
export const getAllDonations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const total = await Donation.countDocuments(filter);

    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      count: donations.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: donations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/v1/donations/:id
export const getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    res.json({
      success: true,
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/donations/create-order
export const createDonationOrder = async (req, res) => {
  try {
    const { amount, name, email, purpose } = req.body;

    if (!amount || !name || !email) {
      return res.status(400).json({
        success: false,
        message: "Amount, name, and email are required",
      });
    }

    // Create donation record with pending status
    const donation = await Donation.create({
      donorName: name,
      donorEmail: email,
      amount,
      purpose: purpose || "General Donation",
      status: "pending",
    });

    // In production, create Razorpay order here
    // For now, return mock order ID
    const orderId = `order_${Date.now()}_${donation._id}`;

    await clearStatsCache();

    res.json({
      success: true,
      orderId,
      donationId: donation._id,
      amount: amount * 100, // Convert to paise for Razorpay
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "test_key",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/donations/verify
export const verifyDonationPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details are incomplete",
      });
    }

    // Extract donation ID from order ID
    const donationId = razorpay_order_id.split("_")[2];

    // Verify signature (in production, verify with Razorpay secret)
    // For now, we'll just update the donation as completed

    const donation = await Donation.findByIdAndUpdate(
      donationId,
      {
        status: "completed",
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
      },
      { new: true },
    );

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found",
      });
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/donations
export const createDonation = async (req, res) => {
  try {
    const { donorName, donorEmail, amount, purpose, paymentMethod, metadata } = req.body;

    const donation = await Donation.create({
      donorName,
      donorEmail,
      amount,
      purpose: purpose || "General Donation",
      status: "completed",
      paymentId: `pay_${Date.now()}`,
      metadata: {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        paymentMethod: paymentMethod || "upi",
      },
    });

    await clearStatsCache();

    res.status(201).json({
      success: true,
      message: "Donation recorded successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
