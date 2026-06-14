import Volunteer from "../models/Volunteer.js";
import Event from "../models/Event.js";

// GET /api/v1/stats
const getStats = async (req, res) => {
  try {
    const [
      totalVolunteers,
      activeVolunteers,
      pendingVolunteers,
      totalEvents,
      upcomingEvents,
      hoursAgg,
      skillBreakdown,
    ] = await Promise.all([
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ status: "Active" }),
      Volunteer.countDocuments({ status: "Pending" }),
      Event.countDocuments(),
      Event.countDocuments({
        date: { $gte: new Date() },
      }),
      Volunteer.aggregate([
        {
          $group: {
            _id: null,
            totalHours: {
              $sum: "$hoursContributed",
            },
          },
        },
      ]),
      Volunteer.aggregate([
        {
          $group: {
            _id: "$skill",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        volunteers: {
          total: totalVolunteers,
          active: activeVolunteers,
          pending: pendingVolunteers,
          inactive: totalVolunteers - activeVolunteers - pendingVolunteers,
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents,
        },
        totalHoursContributed: hoursAgg[0]?.totalHours || 0,
        skillBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getStats };
