import mongoose from "mongoose";
import { logger } from "../utils/logger";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/eventcollect";

// Use MongoDB Atlas in production, localhost in development

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      // Modern Mongoose doesn't need these options, but keeping for compatibility
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    logger.info(
      `✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`,
    );

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
  }
};
