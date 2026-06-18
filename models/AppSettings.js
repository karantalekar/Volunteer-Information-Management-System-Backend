import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    general: {
      organizationName: {
        type: String,
        default: "NayePankh Foundation",
        trim: true,
      },
      contactEmail: {
        type: String,
        default: "contact@nayepankh.org",
        lowercase: true,
        trim: true,
      },
      about: {
        type: String,
        default:
          "NayePankh Foundation is a non-profit organization dedicated to empowering underprivileged communities through volunteer-driven programs in education, healthcare, and environment.",
        trim: true,
      },
      websiteUrl: {
        type: String,
        default: "https://nayepankh.org",
        trim: true,
      },
      phoneNumber: {
        type: String,
        default: "+91 11 1234 5678",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

const AppSettings = mongoose.model("AppSettings", appSettingsSchema);

export default AppSettings;
