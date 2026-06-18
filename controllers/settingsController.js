import AppSettings from "../models/AppSettings.js";

const DEFAULT_KEY = "default";

const getOrCreateSettings = async () => {
  return AppSettings.findOneAndUpdate(
    { key: DEFAULT_KEY },
    { $setOnInsert: { key: DEFAULT_KEY } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
};

const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateGeneralSettings = async (req, res) => {
  try {
    const {
      organizationName,
      contactEmail,
      about,
      websiteUrl,
      phoneNumber,
    } = req.body;

    if (!organizationName || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: "Organization name and contact email are required",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid contact email",
      });
    }

    const settings = await AppSettings.findOneAndUpdate(
      { key: DEFAULT_KEY },
      {
        $set: {
          "general.organizationName": organizationName,
          "general.contactEmail": contactEmail,
          "general.about": about || "",
          "general.websiteUrl": websiteUrl || "",
          "general.phoneNumber": phoneNumber || "",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({
      success: true,
      message: "General settings updated",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getSettings, updateGeneralSettings };
