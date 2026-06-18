import Volunteer from "../models/Volunteer.js";
import Event from "../models/Event.js";
import Donation from "../models/Donation.js";
import { CACHE_KEYS, getCache, setCache } from "../utils/cache.js";

const EVENT_HOURS = 4;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getRecentMonths = () => {
  const now = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);

    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      month: MONTHS[date.getMonth()],
      volunteers: 0,
      events: 0,
      hours: 0,
    };
  });
};

// GET /api/v1/stats
const getStats = async (req, res) => {
  try {
    const cachedStats = await getCache(CACHE_KEYS.adminStats);

    if (cachedStats) {
      return res.json(cachedStats);
    }

    const months = getRecentMonths();
    const monthMap = new Map(months.map((month) => [month.key, month]));
    const monthStart = new Date(months[0].year, months[0].monthIndex, 1);

    const [
      totalVolunteers,
      activeVolunteers,
      pendingVolunteers,
      totalEvents,
      upcomingEvents,
      hoursAgg,
      completedEventHoursAgg,
      skillBreakdown,
      donationAgg,
      completedDonationCount,
      recentVolunteers,
      upcomingEventList,
      volunteerMonthly,
      eventMonthly,
      categoryBreakdown,
    ] = await Promise.all([
      Volunteer.countDocuments(),
      Volunteer.countDocuments({ status: "active" }),
      Volunteer.countDocuments({ status: "pending" }),
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
      Event.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $project: {
            hours: {
              $multiply: [
                {
                  $size: {
                    $ifNull: ["$enrolledVolunteers", []],
                  },
                },
                EVENT_HOURS,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalHours: {
              $sum: "$hours",
            },
          },
        },
      ]),
      Volunteer.aggregate([
        {
          $unwind: "$skills",
        },
        {
          $group: {
            _id: "$skills",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            skill: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 8,
        },
      ]),
      Donation.aggregate([
        {
          $match: {
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: {
              $sum: "$amount",
            },
          },
        },
      ]),
      Donation.countDocuments({ status: "completed" }),
      Volunteer.find()
        .select("name email city status createdAt joinedAt")
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      Event.find({
        $or: [{ status: "upcoming" }, { date: { $gte: new Date() } }],
      })
        .select("name date category volunteersNeeded enrolledVolunteers")
        .sort({ date: 1 })
        .limit(3)
        .lean(),
      Volunteer.aggregate([
        {
          $match: {
            createdAt: {
              $gte: monthStart,
            },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$createdAt",
              },
              month: {
                $month: "$createdAt",
              },
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]),
      Event.aggregate([
        {
          $match: {
            date: {
              $gte: monthStart,
            },
          },
        },
        {
          $project: {
            date: 1,
            eventCount: 1,
            hours: {
              $cond: [
                {
                  $eq: ["$status", "completed"],
                },
                {
                  $multiply: [
                    {
                      $size: {
                        $ifNull: ["$enrolledVolunteers", []],
                      },
                    },
                    EVENT_HOURS,
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$date",
              },
              month: {
                $month: "$date",
              },
            },
            events: {
              $sum: 1,
            },
            hours: {
              $sum: "$hours",
            },
          },
        },
      ]),
      Event.aggregate([
        {
          $group: {
            _id: {
              $ifNull: ["$category", "Uncategorized"],
            },
            value: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            value: -1,
          },
        },
        {
          $project: {
            _id: 0,
            name: "$_id",
            value: 1,
          },
        },
      ]),
    ]);

    const storedVolunteerHours = hoursAgg[0]?.totalHours || 0;
    const completedEventHours = completedEventHoursAgg[0]?.totalHours || 0;

    volunteerMonthly.forEach((item) => {
      const month = monthMap.get(`${item._id.year}-${item._id.month - 1}`);
      if (month) month.volunteers = item.count;
    });

    eventMonthly.forEach((item) => {
      const month = monthMap.get(`${item._id.year}-${item._id.month - 1}`);
      if (!month) return;

      month.events = item.events;
      month.hours = item.hours;
    });

    const response = {
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
        donations: {
          total: donationAgg[0]?.totalAmount || 0,
          completed: completedDonationCount,
        },
        totalHoursContributed: Math.max(
          storedVolunteerHours,
          completedEventHours,
        ),
        monthlyStats: months.map(({ month, volunteers, events, hours }) => ({
          month,
          volunteers,
          events,
          hours,
        })),
        categoryData: categoryBreakdown,
        recentVolunteers,
        upcomingEvents: upcomingEventList.map((event) => ({
          ...event,
          enrolled: event.enrolledVolunteers?.length || 0,
        })),
        skillBreakdown,
      },
    };

    await setCache(CACHE_KEYS.adminStats, response, 60);

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getStats };
