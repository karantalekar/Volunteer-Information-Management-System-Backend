import Volunteer from "../models/Volunteer.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { clearStatsCache } from "../utils/cache.js";

const resolveVolunteerForCurrentUser = async (req, id) => {
  let volunteer = await Volunteer.findById(id);

  if (volunteer || !req.user || req.user.role === "admin") {
    return volunteer;
  }

  if (req.user._id.toString() !== id.toString()) {
    return null;
  }

  if (req.user.email) {
    volunteer = await Volunteer.findOne({ email: req.user.email });
  }

  if (!volunteer) {
    const user = await User.findById(req.user._id).select("+password");

    if (user) {
      volunteer = await Volunteer.create({
        name: user.name,
        email: user.email,
        password: user.password,
        role: "volunteer",
      });
    }
  }

  return volunteer;
};

// GET /api/v1/volunteers
const getAllVolunteers = async (req, res) => {
  try {
    const { status, skill, city, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (skill) filter.skills = skill;
    if (city) filter.city = new RegExp(city, "i");

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const total = await Volunteer.countDocuments(filter);

    const volunteers = await Volunteer.find(filter)
      .populate({
        path: "eventsJoined",
        model: Event,
        select: "name date location category",
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      count: volunteers.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: volunteers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/v1/volunteers/:id
const getVolunteer = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id).populate(
      "eventsJoined",
      "name date location category",
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    res.json({
      success: true,
      data: volunteer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/volunteers
const createVolunteer = async (req, res) => {
  try {
    const { name, email, password, phone, city, skills, availability, notes } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existing = await Volunteer.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered as volunteer",
      });
    }

    const volunteer = await Volunteer.create({
      name,
      email,
      password,
      phone: phone || "",
      city: city || "",
      skills: Array.isArray(skills) ? skills : [],
      availability: availability || "Weekends",
      notes: notes || "",
    });

    await clearStatsCache();

    res.status(201).json({
      success: true,
      message: "Volunteer registered successfully",
      data: volunteer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT /api/v1/volunteers/:id
const updateVolunteer = async (req, res) => {
  try {
    const volunteer = await resolveVolunteerForCurrentUser(req, req.params.id);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      volunteer._id.toString() !== req.user._id.toString() &&
      volunteer.email !== req.user.email
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile",
      });
    }

    const allowedFields = [
      "name",
      "phone",
      "city",
      "skills",
      "availability",
      "status",
      "avatar",
      "notes",
    ];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.user.role !== "admin") {
      delete updateData.status;
    }

    const shouldNotifyAccountConfirmed =
      req.user.role === "admin" &&
      updateData.status === "active" &&
      volunteer.status !== "active";

    const updatedVolunteer = await Volunteer.findByIdAndUpdate(
      volunteer._id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (shouldNotifyAccountConfirmed) {
      await Notification.findOneAndUpdate(
        {
          volunteer: volunteer._id,
          type: "account_confirmation",
        },
        {
          volunteer: volunteer._id,
          type: "account_confirmation",
          title: "Account confirmed",
          message:
            "Your volunteer account has been approved. You can now access volunteer features and join events.",
          status: "info",
          read: false,
          sentBy: req.user._id,
          respondedAt: null,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Volunteer updated",
      data: updatedVolunteer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/v1/volunteers/:id (admin only)
const deleteVolunteer = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndDelete(req.params.id);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Volunteer removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PATCH /api/v1/volunteers/:id/hours (admin only)
const updateHours = async (req, res) => {
  try {
    const { hours } = req.body;

    if (typeof hours !== "number" || hours < 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid hours value",
      });
    }

    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      {
        $inc: {
          hoursContributed: hours,
        },
      },
      {
        new: true,
      },
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Volunteer hours updated",
      data: volunteer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getAllVolunteers,
  getVolunteer,
  createVolunteer,
  updateVolunteer,
  deleteVolunteer,
  updateHours,
};
