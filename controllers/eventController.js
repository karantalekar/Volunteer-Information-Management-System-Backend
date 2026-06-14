import Event from "../models/Event.js";
import Volunteer from "../models/Volunteer.js";

// GET /api/v1/events
const getAllEvents = async (req, res) => {
  try {
    const { category, upcoming } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (upcoming === "true") filter.date = { $gte: new Date() };

    const events = await Event.find(filter)
      .populate("enrolledVolunteers", "firstName lastName email")
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
      .populate("enrolledVolunteers", "firstName lastName email skill city")
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
    const { name, description, date, location, category, volunteersNeeded } =
      req.body;

    const event = await Event.create({
      name,
      description,
      date,
      location,
      category,
      volunteersNeeded,
      createdBy: req.user._id,
    });

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
    const { volunteerId } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.enrolledVolunteers.length >= event.volunteersNeeded) {
      return res.status(400).json({
        success: false,
        message: "Event is fully enrolled",
      });
    }

    if (event.enrolledVolunteers.includes(volunteerId)) {
      return res.status(400).json({
        success: false,
        message: "Volunteer already enrolled",
      });
    }

    event.enrolledVolunteers.push(volunteerId);
    await event.save();

    await Volunteer.findByIdAndUpdate(volunteerId, {
      $addToSet: {
        eventsEnrolled: event._id,
      },
    });

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
    const { volunteerId } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    event.enrolledVolunteers = event.enrolledVolunteers.filter(
      (v) => v.toString() !== volunteerId,
    );

    await event.save();

    await Volunteer.findByIdAndUpdate(volunteerId, {
      $pull: {
        eventsEnrolled: event._id,
      },
    });

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
