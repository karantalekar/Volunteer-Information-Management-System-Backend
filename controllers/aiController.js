import Volunteer from "../models/Volunteer.js";
import Event from "../models/Event.js";

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
].filter(Boolean);

const extractGeminiText = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim() || "";

const callGemini = async (prompt, options = {}) => {
  if (!process.env.GEMINI_API_KEY) {
    return "";
  }

  let lastError = "";

  for (const model of GEMINI_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: 700,
            ...(options.responseMimeType
              ? { responseMimeType: options.responseMimeType }
              : {}),
          },
        }),
      },
    );

    const data = await response.json();

    if (response.ok) {
      return extractGeminiText(data);
    }

    lastError = data?.error?.message || "Gemini request failed";

    if (![400, 404].includes(response.status)) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
};

const extractJsonArray = (text) => {
  const cleaned = text
    .replace(/```json|```/gi, "")
    .replace(/^\s*json\s*/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Gemini did not return a JSON array: ${cleaned.slice(0, 120)}`);
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
};

const buildFallbackDescription = ({
  name,
  category,
  location,
  volunteersNeeded,
}) => {
  const categoryDescriptions = {
    Education:
      "Join us in making education more accessible through hands-on mentoring, learning support, and community outreach.",
    Healthcare:
      "Support a healthcare initiative that brings essential care, awareness, and assistance to people who need it most.",
    Environment:
      "Help create a cleaner, greener community through practical environmental action and public participation.",
    "Women Empowerment":
      "Contribute to a program focused on confidence, safety, livelihood skills, and equal opportunity for women.",
    Fundraising:
      "Help raise awareness and resources for meaningful community programs that create measurable impact.",
    Empowerment:
      "Participate in a focused empowerment program that helps people build confidence, skills, and access.",
    Youth:
      "Guide young people through a practical, inspiring event designed to build skills and opportunity.",
    Social:
      "Be part of a social initiative that strengthens community bonds and supports people with dignity.",
  };

  const intro =
    categoryDescriptions[category] ||
    `Join us for ${name}, a ${category} volunteering opportunity.`;

  return `${intro} The event will take place in ${location || "the community"} and needs ${volunteersNeeded || "dedicated"} volunteers to help with coordination, outreach, participant support, and on-ground execution. Your time can help turn this event into a smooth, welcoming, and meaningful experience for everyone involved.`;
};

const normalizeForPrompt = (value) =>
  String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/["\\]/g, "")
    .trim();

const heuristicMatches = (volunteers, { category, location }) =>
  volunteers
    .map((volunteer) => {
      const skills = volunteer.skills || [];
      const hasSkillMatch = skills.some(
        (skill) => skill.toLowerCase() === category.toLowerCase(),
      );
      const hasLocationMatch =
        location && volunteer.city?.toLowerCase().includes(location.toLowerCase());
      const hoursBonus = Math.min(10, Math.floor((volunteer.hoursContributed || 0) / 20));
      const matchPercentage = Math.min(
        100,
        55 + (hasSkillMatch ? 25 : 0) + (hasLocationMatch ? 15 : 0) + hoursBonus,
      );

      return {
        volunteerId: volunteer._id,
        name: volunteer.name || volunteer.email,
        matchPercentage,
        reason: [
          hasSkillMatch ? "Skill matches the event category" : "General volunteering fit",
          hasLocationMatch ? "Location is convenient" : "Can be considered if available",
          hoursBonus ? "Has prior contribution experience" : "Newer volunteer profile",
        ].join(". "),
        skills,
        city: volunteer.city || "",
        hoursContributed: volunteer.hoursContributed || 0,
        avatar: volunteer.avatar || "",
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

// POST /api/v1/ai/generate-description
export const generateEventDescription = async (req, res) => {
  try {
    const { name, category, location, volunteersNeeded } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: "Event name and category are required",
      });
    }

    const prompt = `Write a polished volunteer event description for NayePankh Foundation.
Event name: ${name}
Category: ${category}
Location: ${location || "India"}
Volunteers needed: ${volunteersNeeded || "not specified"}

Requirements:
- 100 to 140 words
- warm, specific, action-oriented
- mention what volunteers will help with
- avoid markdown and avoid exaggeration`;

    let description = "";

    try {
      description = await callGemini(prompt);
    } catch (error) {
      console.error("Gemini description error:", error.message);
    }

    if (!description) {
      description = buildFallbackDescription({
        name,
        category,
        location,
        volunteersNeeded,
      });
    }

    res.json({
      success: true,
      description,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/ai/match-volunteers
export const matchVolunteersToEvent = async (req, res) => {
  try {
    const { category, location, volunteersNeeded, title } = req.body;

    if (!category || !volunteersNeeded) {
      return res.status(400).json({
        success: false,
        message: "Category and volunteersNeeded are required",
      });
    }

    const limit = Math.min(Math.max(Number(volunteersNeeded) || 5, 5), 12);
    const volunteers = await Volunteer.find({ status: "active" })
      .select("name email city skills availability hoursContributed avatar")
      .limit(50);

    let matches = heuristicMatches(volunteers, { category, location }).slice(
      0,
      limit,
    );

    const prompt = `Rank volunteers for an event.
Event: ${title || category}
Category: ${category}
Location: ${location || "not specified"}
Needed volunteers: ${volunteersNeeded}

Volunteers:
${matches
  .map(
    (v) =>
      `id=${v.volunteerId}; name=${normalizeForPrompt(v.name)}; city=${normalizeForPrompt(v.city)}; skills=${v.skills.map(normalizeForPrompt).join(", ")}; hours=${v.hoursContributed}`,
  )
  .join("\n")}

Return only a JSON array. Each item must have:
- volunteerId as a string
- matchPercentage as a number from 0 to 100
- reason as one short plain string under 18 words`;

    try {
      const text = await callGemini(prompt, {
        responseMimeType: "application/json",
      });
      if (!text) {
        throw new Error("Gemini unavailable");
      }
      const aiMatches = extractJsonArray(text);

      if (Array.isArray(aiMatches)) {
        const byId = new Map(matches.map((match) => [match.volunteerId.toString(), match]));
        matches = aiMatches
          .map((match) => {
            const base = byId.get(match.volunteerId?.toString());
            if (!base) return null;
            return {
              ...base,
              matchPercentage: Number(match.matchPercentage) || base.matchPercentage,
              reason: match.reason || base.reason,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.matchPercentage - a.matchPercentage);
      }
    } catch (error) {
      const message = error.message || "unknown error";
      if (/json/i.test(message)) {
        console.warn(
          "Gemini matching returned invalid JSON; using heuristic matches:",
          message,
        );
      } else {
        console.info(
          "Gemini matching unavailable; using heuristic matches:",
          message,
        );
      }
    }

    res.json({
      success: true,
      matches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/v1/ai/chat
export const chatAssistant = async (req, res) => {
  try {
    const { message, user } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const events = await Event.find({ date: { $gte: new Date() } })
      .select("name category location date volunteersNeeded enrolledVolunteers")
      .sort({ date: 1 })
      .limit(8);

    const prompt = `You are the NayePankh Foundation volunteer assistant.
Answer briefly and helpfully. Suggest concrete next actions in the app when useful.

Volunteer context:
Name: ${user?.name || "Volunteer"}
City: ${user?.city || "not provided"}
Skills: ${(user?.skills || []).join(", ") || "not provided"}

Upcoming events:
${events
  .map(
    (event) =>
      `${event.name} | ${event.category} | ${event.location} | ${event.date.toISOString().slice(0, 10)} | spots ${Math.max((event.volunteersNeeded || 0) - (event.enrolledVolunteers?.length || 0), 0)}`,
  )
  .join("\n")}

Question: ${message}`;

    let reply = "";

    try {
      reply = await callGemini(prompt);
    } catch (error) {
      console.error("Gemini chat error:", error.message);
    }

    if (!reply) {
      reply =
        "I can help you find suitable events, improve your profile, and understand certificates or contribution hours. Add your city and skills in Profile so matching becomes more accurate.";
    }

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
