import express from "express";
const router = express.Router();

// GET /api/events
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Events endpoints coming soon",
    data: [],
  });
});

// POST /api/events
router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Create event endpoint coming soon",
    data: req.body,
  });
});

// POST /api/events/set-active
router.post("/set-active", (req, res) => {
  res.json({
    success: true,
    message: "Set active event endpoint coming soon",
    data: req.body,
  });
});

export default router;
