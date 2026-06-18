import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Volunteer",
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    type: {
      type: String,
      enum: ["event_invitation", "account_confirmation"],
      default: "event_invitation",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "info"],
      default: "pending",
    },
    read: {
      type: Boolean,
      default: false,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index(
  { volunteer: 1, event: 1, type: 1 },
  { unique: true },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
