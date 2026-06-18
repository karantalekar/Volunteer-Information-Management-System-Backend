import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";

// Protect routes — require valid JWT
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await User.findById(decoded.id);

    if (!user) {
      user = await Volunteer.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired.",
    });
  }
};

// Restrict to admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }

  next();
};

const activeVolunteerOrAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return next();
  }

  if (req.user.status !== "active") {
    return res.status(403).json({
      success: false,
      message: "Your volunteer profile must be approved by an admin before you can view events.",
    });
  }

  next();
};

export { protect, adminOnly, activeVolunteerOrAdmin };
