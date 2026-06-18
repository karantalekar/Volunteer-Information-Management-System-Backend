import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const volunteerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },

    role: {
      type: String,
      enum: ["admin", "volunteer"],
      default: "volunteer",
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    availability: {
      type: String,
      enum: ["Weekdays", "Weekends", "Both", "Remote only"],
      default: "Weekends",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },

    hoursContributed: {
      type: Number,
      default: 0,
    },

    eventsJoined: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],

    avatar: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
volunteerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with hashed password
volunteerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

volunteerSchema.index({ status: 1, createdAt: -1 });
volunteerSchema.index({ createdAt: -1 });
volunteerSchema.index({ skills: 1 });

const Volunteer = mongoose.model("Volunteer", volunteerSchema);

export default Volunteer;
