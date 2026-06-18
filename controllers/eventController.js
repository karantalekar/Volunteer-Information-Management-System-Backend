import Event from "../models/Event.js";
import Volunteer from "../models/Volunteer.js";
import User from "../models/User.js";
import { clearStatsCache } from "../utils/cache.js";

const getVolunteerForEnrollment = async (req) => {
  const requestedVolunteerId = req.body.volunteerId;

  if (requestedVolunteerId) {
    return Volunteer.findById(requestedVolunteerId);
  }

  if (!req.user?._id) {
    return null;
  }

  let volunteer = await Volunteer.findById(req.user._id);

  if (!volunteer && req.user.email) {
    volunteer = await Volunteer.findOne({ email: req.user.email });
  }

  if (!volunteer && req.user.role === "volunteer") {
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

// GET /api/v1/events
const getAllEvents = async (req, res) => {
  try {
    const { category, upcoming } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const events = await Event.find(filter)
      .populate("enrolledVolunteers", "name email skills city")
      .populate("createdBy", "name")
      .sort({ date: 1 });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/v1/events/:id
const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("enrolledVolunteers", "name email skills city")
      .populate("createdBy", "name email");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/events (admin only)
const createEvent = async (req, res) => {
  try {
    // const { name, description, date, location, category, volunteersNeeded } =
    //   req.body;

    const {
      name,
      description,
      date,
      endDate,
      location,
      category,
      volunteersNeeded,
      status,
      image,
      organizer,
    } = req.body;

    const event = await Event.create({
      name,
      description: description || "",
      date,
      endDate: endDate || null,
      location,
      category,
      volunteersNeeded,
      status: status || "upcoming",
      image: image || "",
      organizer: organizer || "",
      createdBy: req.user._id,
    });

    await clearStatsCache();

    res.status(201).json({
      success: true,
      message: "Event created",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT /api/v1/events/:id (admin only)
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Event updated",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/v1/events/:id (admin only)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await clearStatsCache();

    res.json({
      success: true,
      message: "Event deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/events/:id/enroll
const enrollVolunteer = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const volunteer = await getVolunteerForEnrollment(req);

    if (!volunteer) {
      return res.status(400).json({
        success: false,
        message: "Volunteer profile not found",
      });
    }

    const volunteerId = volunteer._id;

    if (
      event.enrolledVolunteers.some(
        (id) => id.toString() === volunteerId.toString(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Volunteer already enrolled",
      });
    }

    if (event.enrolledVolunteers.length >= event.volunteersNeeded) {
      return res.status(400).json({
        success: false,
        message: "Event is fully enrolled",
      });
    }

    event.enrolledVolunteers.push(volunteerId);
    await event.save();

    await Volunteer.findByIdAndUpdate(
      volunteerId,
      {
        $addToSet: {
          eventsJoined: event._id,
        },
      },
      { new: true },
    );

    await clearStatsCache();

    res.json({
      success: true,
      message: "Volunteer enrolled in event",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE /api/v1/events/:id/unenroll
const unenrollVolunteer = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const volunteer = await getVolunteerForEnrollment(req);

    if (!volunteer) {
      return res.status(400).json({
        success: false,
        message: "Volunteer profile not found",
      });
    }

    const volunteerId = volunteer._id;

    event.enrolledVolunteers = event.enrolledVolunteers.filter(
      (v) => v.toString() !== volunteerId.toString(),
    );

    await event.save();

    await Volunteer.findByIdAndUpdate(
      volunteerId,
      {
        $pull: {
          eventsJoined: event._id,
        },
      },
      { new: true },
    );

    await clearStatsCache();

    res.json({
      success: true,
      message: "Volunteer unenrolled from event",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  enrollVolunteer,
  unenrollVolunteer,
};
