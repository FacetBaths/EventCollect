import express from "express";
const router = express.Router();

// GET /api/services
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Services endpoints",
    data: process.env.DEFAULT_SERVICES?.split(",") || [
      "Roofing",
      "Gutters",
      "Siding",
      "Windows",
      "Doors",
      "Insulation",
      "Solar",
      "Other",
    ],
  });
});

// POST /api/services
router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Create service endpoint coming soon",
    data: req.body,
  });
});

export default router;
