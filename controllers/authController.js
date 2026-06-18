import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";
import { clearStatsCache } from "../utils/cache.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const toAuthUser = (account, fallbackRole = "volunteer") => ({
  _id: account._id,
  name: account.name,
  email: account.email,
  role: account.role || fallbackRole,
  phone: account.phone,
  city: account.city,
  skills: account.skills,
  availability: account.availability,
  status: account.status,
  hoursContributed: account.hoursContributed,
  avatar: account.avatar,
  notes: account.notes,
  createdAt: account.createdAt,
});

// POST /api/v1/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedRole = role === "admin" ? "admin" : "volunteer";

    const existingUser = await User.findOne({ email });
    const existingVolunteer = await Volunteer.findOne({ email });

    if (existingUser || existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const account =
      normalizedRole === "volunteer"
        ? await Volunteer.create({
            name,
            email,
            password,
            role: "volunteer",
          })
        : await User.create({
            name,
            email,
            password,
            role: "admin",
          });

    await clearStatsCache();

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: generateToken(account._id),
      user: toAuthUser(account, normalizedRole),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    let account = await Volunteer.findOne({ email }).select("+password");

    if (!account) {
      account = await User.findOne({ email }).select("+password");
    }

    if (!account || !(await account.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const role = account.role || "volunteer";

    res.json({
      success: true,
      token: generateToken(account._id),
      user: toAuthUser(account, role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/v1/auth/me
export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: toAuthUser(req.user, req.user.role || "volunteer"),
  });
};
