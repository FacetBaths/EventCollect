import express from "express";
const router = express.Router();

// GET /api/config
router.get("/", (req, res) => {
  res.json({
    success: true,
    data: {
      currentEvent: process.env.DEFAULT_EVENT_NAME || "Ribfest--LITH",
      defaultServices: process.env.DEFAULT_SERVICES?.split(",") || [
        "Wet Space Update",
        "Wet Space Conversion",
        "Walk-in Tub",
        "Full Remodel",
        "Flooring",
        "Vanity",
        "Toilet",
        "Safety",
        "Other",
      ],
      features: {
        leapSync: process.env.ENABLE_LEAP_SYNC === "true",
        emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
        fileUploads: process.env.ENABLE_FILE_UPLOADS === "true",
      },
    },
  });
});

// GET /api/config/current-event
router.get("/current-event", (req, res) => {
  res.json({
    success: true,
    data: {
      name: process.env.DEFAULT_EVENT_NAME || "Ribfest--LITH",
      id: process.env.CURRENT_EVENT_ID || null,
    },
  });
});

export default router;
