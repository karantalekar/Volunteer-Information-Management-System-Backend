// import mongoose from "mongoose";

// const eventSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Event name is required"],
//       trim: true,
//     },
//     description: {
//       type: String,
//       default: "",
//     },
//     date: {
//       type: Date,
//       required: [true, "Event date is required"],
//     },
//     location: {
//       type: String,
//       required: [true, "Location is required"],
//     },
//     category: {
//       type: String,
//       enum: [
//         "Education",
//         "Health",
//         "Environment",
//         "Women Empowerment",
//         "Fundraising",
//       ],
//       required: [true, "Category is required"],
//     },
//     volunteersNeeded: {
//       type: Number,
//       required: [true, "Volunteers needed count is required"],
//       min: 1,
//     },
//     enrolledVolunteers: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Volunteer",
//       },
//     ],
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//   },
//   {
//     timestamps: true,
//   },
// );

// // Virtual for enrolled count
// eventSchema.virtual("enrolledCount").get(function () {
//   return this.enrolledVolunteers.length;
// });

// eventSchema.set("toJSON", {
//   virtuals: true,
// });

// const Event = mongoose.model("Event", eventSchema);

// export default Event;

import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "Education",
        "Healthcare",
        "Environment",
        "Women Empowerment",
        "Fundraising",
        "Empowerment",
        "Youth",
        "Social",
      ],
      required: [true, "Category is required"],
    },

    location: {
      type: String,
      required: [true, "Location is required"],
    },

    date: {
      type: Date,
      required: [true, "Event date is required"],
    },

    endDate: {
      type: Date,
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
        default: [],
      },
    ],

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    image: {
      type: String,
      default: "",
    },

    organizer: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Virtual field
eventSchema.virtual("enrolledCount").get(function () {
  return Array.isArray(this.enrolledVolunteers)
    ? this.enrolledVolunteers.length
    : 0;
});

eventSchema.set("toJSON", {
  virtuals: true,
});

eventSchema.set("toObject", {
  virtuals: true,
});

eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
