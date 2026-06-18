import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    donorName: {
      type: String,
      required: [true, "Donor name is required"],
      trim: true,
    },
    donorEmail: {
      type: String,
      required: [true, "Donor email is required"],
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    purpose: {
      type: String,
      default: "General Donation",
    },
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayOrderId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    razorpaySignature: {
      type: String,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ createdAt: -1 });

const Donation = mongoose.model("Donation", donationSchema);

export default Donation;
