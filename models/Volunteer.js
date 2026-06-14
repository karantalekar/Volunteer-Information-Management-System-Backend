import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },

    city: {
      type: String,
      required: [true, "City is required"],
    },

    skill: {
      type: String,
      enum: [
        "Teaching",
        "Design",
        "Development",
        "Fundraising",
        "Healthcare",
        "Event Mgmt",
      ],
      required: [true, "Skill is required"],
    },

    availability: {
      type: String,
      enum: ["Weekdays", "Weekends", "Both", "Remote only"],
      default: "Weekends",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Pending",
    },

    hoursContributed: {
      type: Number,
      default: 0,
    },

    eventsEnrolled: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Volunteer = mongoose.model("Volunteer", volunteerSchema);

export default Volunteer;
