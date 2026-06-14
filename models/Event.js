import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    category: {
      type: String,
      enum: [
        "Education",
        "Health",
        "Environment",
        "Women Empowerment",
        "Fundraising",
      ],
      required: [true, "Category is required"],
    },
    volunteersNeeded: {
      type: Number,
      required: [true, "Volunteers needed count is required"],
      min: 1,
    },
    enrolledVolunteers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Volunteer",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for enrolled count
eventSchema.virtual("enrolledCount").get(function () {
  return this.enrolledVolunteers.length;
});

eventSchema.set("toJSON", {
  virtuals: true,
});

const Event = mongoose.model("Event", eventSchema);

export default Event;
