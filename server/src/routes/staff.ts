import express from "express";
const router = express.Router();

// GET /api/staff
router.get("/", (req, res) => {
  res.json({ success: true, message: "Staff endpoints coming soon", data: [] });
});

// POST /api/staff
router.post("/", (req, res) => {
  res.json({
    success: true,
    message: "Create staff endpoint coming soon",
    data: req.body,
  });
});

export default router;
