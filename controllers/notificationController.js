import Event from "../models/Event.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Volunteer from "../models/Volunteer.js";
import { clearStatsCache } from "../utils/cache.js";

const resolveCurrentVolunteer = async (req) => {
  if (!req.user?._id) return null;

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

export const getMyNotifications = async (req, res) => {
  try {
    const volunteer = await resolveCurrentVolunteer(req);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer profile not found",
      });
    }

    const notifications = await Notification.find({ volunteer: volunteer._id })
      .populate("event", "name date location category volunteersNeeded enrolledVolunteers")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: notifications.length,
      unread: notifications.filter((notification) => !notification.read).length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendEventInvitation = async (req, res) => {
  try {
    const { volunteerId, eventId, message } = req.body;

    if (!volunteerId || !eventId) {
      return res.status(400).json({
        success: false,
        message: "Volunteer id and event id are required",
      });
    }

    const [volunteer, event] = await Promise.all([
      Volunteer.findById(volunteerId),
      Event.findById(eventId),
    ]);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found",
      });
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        volunteer: volunteer._id,
        event: event._id,
        type: "event_invitation",
      },
      {
        volunteer: volunteer._id,
        event: event._id,
        type: "event_invitation",
        title: `Invitation: ${event.name}`,
        message:
          message ||
          `You have been invited to join ${event.name} in ${event.location}. Please accept or reject this invitation.`,
        status: "pending",
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
    ).populate("event", "name date location category volunteersNeeded enrolledVolunteers");

    res.status(201).json({
      success: true,
      message: "Invitation sent",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const respondToInvitation = async (req, res) => {
  try {
    const { response } = req.body;

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Response must be accepted or rejected",
      });
    }

    const volunteer = await resolveCurrentVolunteer(req);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer profile not found",
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      volunteer: volunteer._id,
    }).populate("event");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Invitation has already been responded to",
      });
    }

    if (response === "accepted") {
      const event = await Event.findById(notification.event._id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      const alreadyEnrolled = event.enrolledVolunteers.some(
        (id) => id.toString() === volunteer._id.toString(),
      );

      if (!alreadyEnrolled) {
        if (event.enrolledVolunteers.length >= event.volunteersNeeded) {
          return res.status(400).json({
            success: false,
            message: "Event is fully enrolled",
          });
        }

        event.enrolledVolunteers.push(volunteer._id);
        await event.save();
      }

      await Volunteer.findByIdAndUpdate(volunteer._id, {
        $addToSet: { eventsJoined: event._id },
      });
    }

    notification.status = response;
    notification.read = true;
    notification.respondedAt = new Date();
    await notification.save();
    if (response === "accepted") {
      await clearStatsCache();
    }
    await notification.populate(
      "event",
      "name date location category volunteersNeeded enrolledVolunteers",
    );

    res.json({
      success: true,
      message:
        response === "accepted"
          ? "Invitation accepted and event joined"
          : "Invitation rejected",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const volunteer = await resolveCurrentVolunteer(req);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: "Volunteer profile not found",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        volunteer: volunteer._id,
      },
      { read: true },
      { new: true },
    ).populate("event", "name date location category volunteersNeeded enrolledVolunteers");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
