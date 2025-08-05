import express from "express";
import { Event, IEvent } from "../models/Event";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/events - Get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (error: any) {
    logger.error("Error retrieving events", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: "Error retrieving events",
      message: error.message,
    });
  }
});

// GET /api/events/active - Get the currently active event
router.get("/active", async (req, res) => {
  try {
    const activeEvent = await Event.findOne({ isActive: true });
    
    if (!activeEvent) {
      return res.json({
        success: true,
        data: null,
        message: "No active event found",
      });
    }

    res.json({ success: true, data: activeEvent });
  } catch (error: any) {
    logger.error("Error retrieving active event", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: "Error retrieving active event",
      message: error.message,
    });
  }
});

// POST /api/events - Create a new event
router.post("/", async (req, res) => {
  try {
    const eventData: IEvent = req.body;
    
    // Validate required fields
    if (!eventData.name || !eventData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: "Event name is required",
      });
    }

    const newEvent = new Event(eventData);
    await newEvent.save();
    
    logger.info("Event created successfully", { 
      eventId: newEvent._id,
      eventName: newEvent.name,
      isActive: newEvent.isActive,
    });
    
    res.status(201).json({ success: true, data: newEvent });
  } catch (error: any) {
    logger.error("Error creating event", {
      error: error.message,
      stack: error.stack,
      eventData: req.body,
    });
    
    // Handle duplicate name error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Duplicate event name",
        message: "An event with this name already exists",
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Error creating event",
      message: error.message,
    });
  }
});

// PUT /api/events/:id - Update an event
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        message: "Event with the specified ID was not found",
      });
    }
    
    logger.info("Event updated successfully", { 
      eventId: updatedEvent._id,
      eventName: updatedEvent.name,
      isActive: updatedEvent.isActive,
    });
    
    res.json({ success: true, data: updatedEvent });
  } catch (error: any) {
    logger.error("Error updating event", {
      error: error.message,
      stack: error.stack,
      eventId: req.params.id,
      updateData: req.body,
    });
    
    // Handle duplicate name error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Duplicate event name",
        message: "An event with this name already exists",
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Error updating event",
      message: error.message,
    });
  }
});

// PUT /api/events/:id/activate - Set an event as active (deactivates all others)
router.put("/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the event first
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        message: "Event with the specified ID was not found",
      });
    }
    
    // Set this event as active (pre-save hook will deactivate others)
    event.isActive = true;
    await event.save();
    
    logger.info("Event activated successfully", { 
      eventId: event._id,
      eventName: event.name,
    });
    
    res.json({ 
      success: true, 
      data: event,
      message: `Event "${event.name}" is now active`,
    });
  } catch (error: any) {
    logger.error("Error activating event", {
      error: error.message,
      stack: error.stack,
      eventId: req.params.id,
    });
    
    res.status(500).json({
      success: false,
      error: "Error activating event",
      message: error.message,
    });
  }
});

// DELETE /api/events/:id - Delete an event
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedEvent = await Event.findByIdAndDelete(id);
    
    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
        message: "Event with the specified ID was not found",
      });
    }
    
    logger.info("Event deleted successfully", { 
      eventId: deletedEvent._id,
      eventName: deletedEvent.name,
    });
    
    res.json({ 
      success: true, 
      data: deletedEvent,
      message: `Event "${deletedEvent.name}" has been deleted`,
    });
  } catch (error: any) {
    logger.error("Error deleting event", {
      error: error.message,
      stack: error.stack,
      eventId: req.params.id,
    });
    
    res.status(500).json({
      success: false,
      error: "Error deleting event",
      message: error.message,
    });
  }
});

export default router;
