import express from "express";
import mongoose from "mongoose";
import { leapService } from "../services/leapService";

const router = express.Router();

// Health check endpoint
router.get("/", async (req, res) => {
  try {
    // Check database connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    // Basic system info
    let leapConnectionStatus = "unknown";

    try {
      const leapConnection = await leapService.testConnection();
      leapConnectionStatus = leapConnection.data.connectionStatus;
    } catch (error) {
      leapConnectionStatus = "disconnected";
    }

    const healthData = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        name: mongoose.connection.name,
      },
      leapCRM: {
        status: leapConnectionStatus,
      },
      memory: process.memoryUsage(),
      features: {
        leapSync: process.env.ENABLE_LEAP_SYNC === "true",
        emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === "true",
        fileUploads: process.env.ENABLE_FILE_UPLOADS === "true",
      },
    };

    res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Service unavailable",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
