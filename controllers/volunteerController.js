import Volunteer from "../models/Volunteer.js";

// GET /api/v1/volunteers
const getAllVolunteers = async (req, res) => {
  try {
    const { status, skill, city, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (skill) filter.skill = skill;
    if (city) filter.city = new RegExp(city, "i");

    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const total = await Volunteer.countDocuments(filter);

    const volunteers = await Volunteer.find(filter)
      .populate("eventsEnrolled", "name date")
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
      "eventsEnrolled",
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
    const {
      firstName,
      lastName,
      email,
      phone,
      city,
      skill,
      availability,
      notes,
    } = req.body;

    const existing = await Volunteer.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered as volunteer",
      });
    }

    const volunteer = await Volunteer.create({
      firstName,
      lastName,
      email,
      phone,
      city,
      skill,
      availability,
      notes,
    });

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
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    res.json({
      success: true,
      message: "Volunteer updated",
      data: volunteer,
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

    res.json({
      success: true,
      message: `${hours} hours added`,
      totalHours: volunteer.hoursContributed,
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
