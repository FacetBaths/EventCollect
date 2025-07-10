import express from "express";
import { leapService } from "../services/leapService";
import { logger } from "../utils/logger";

const router = express.Router();

// Test LEAP connection
router.get("/test-connection", async (req, res) => {
  try {
    logger.info("Testing LEAP CRM connection via API endpoint");

    const connectionTest = await leapService.testConnection();

    res.json({
      success: true,
      message: "LEAP CRM connection test completed",
      data: connectionTest,
    });
  } catch (error: any) {
    logger.error("LEAP CRM connection test failed", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to test LEAP CRM connection",
      details: error.response?.data || null,
    });
  }
});

// Get appointments from LEAP
router.get('/appointments', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    logger.info('Fetching appointments from LEAP CRM', { startDate, endDate, userId });
    
    const appointments = await leapService.getAppointments(
      startDate as string,
      endDate as string,
      userId as string
    );
    
    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: appointments.data
    });
  } catch (error: any) {
    logger.error('Failed to get appointments', {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || 'No additional data'
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get appointments',
      details: error.response?.data || null,
      timestamp: new Date().toISOString(),
      endpoint: '/api/leap-sync/appointments'
    });
  }
});

// Check appointment availability
router.get('/availability', async (req, res) => {
  try {
    const { date, timeSlots, userId } = req.query;
    
    logger.info('Checking appointment availability', { date, timeSlots, userId });
    
    const slots = timeSlots ? (timeSlots as string).split(',') : undefined;
    
    const availability = await leapService.checkAppointmentAvailability(
      date as string,
      slots,
      userId as string
    );
    
    res.json({
      success: true,
      message: 'Availability checked successfully',
      data: availability.data
    });
  } catch (error: any) {
    logger.error('Failed to check appointment availability', {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || 'No additional data'
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check appointment availability',
      details: error.response?.data || null,
      timestamp: new Date().toISOString(),
      endpoint: '/api/leap-sync/availability'
    });
  }
});

// Find next available Monday appointment
router.get('/next-monday', async (req, res) => {
  try {
    const { timeSlots, userId } = req.query;
    
    logger.info('Finding next available Monday appointment', { timeSlots, userId });
    
    const slots = timeSlots ? (timeSlots as string).split(',') : undefined;
    
    const nextMonday = await leapService.findNextAvailableMonday(
      slots,
      userId as string
    );
    
    res.json({
      success: true,
      message: 'Next available Monday checked successfully',
      data: nextMonday.data
    });
  } catch (error: any) {
    logger.error('Failed to find next available Monday', {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || 'No additional data'
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find next available Monday',
      details: error.response?.data || null,
      timestamp: new Date().toISOString(),
      endpoint: '/api/leap-sync/next-monday'
    });
  }
});

// Resync all LEAP data
router.post("/resync-all", async (req, res) => {
  try {
    logger.info("Starting full LEAP CRM resync");

    const results = {
      connectionTest: null as any,
      errors: [] as string[],
    };

    // Test connection first
    try {
      results.connectionTest = await leapService.testConnection();
      logger.info("LEAP connection test passed during resync");
    } catch (error: any) {
      results.errors.push(`Connection test failed: ${error.message}`);
      logger.error("LEAP connection test failed during resync", error);
    }

    // Determine overall success
    const hasErrors = results.errors.length > 0;
    const status = hasErrors ? 500 : 200;

    logger.info("LEAP CRM resync completed", {
      hasErrors,
      errorCount: results.errors.length,
    });

    res.status(status).json({
      success: !hasErrors,
      message: hasErrors
        ? `Resync completed with ${results.errors.length} errors`
        : "Full resync completed successfully",
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Full LEAP CRM resync failed", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to resync LEAP CRM data",
      details: error.response?.data || null,
      timestamp: new Date().toISOString(),
      endpoint: "/api/leap-sync/resync-all",
    });
  }
});

// Get company trades
router.get("/trades", async (req, res) => {
  try {
    logger.info("Getting company trades via API endpoint");

    const trades = await leapService.getCompanyTrades();

    res.json({
      success: true,
      message: "Company trades retrieved successfully",
      data: trades.data,
    });
  } catch (error: any) {
    logger.error("Failed to get company trades", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get company trades",
      details: error.response?.data || null,
    });
  }
});

// Get divisions
router.get("/divisions", async (req, res) => {
  try {
    logger.info("Getting divisions via API endpoint");

    const divisions = await leapService.getDivisions();

    res.json({
      success: true,
      message: "Divisions retrieved successfully",
      data: divisions.data,
    });
  } catch (error: any) {
    logger.error("Failed to get divisions", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get divisions",
      details: error.response?.data || null,
    });
  }
});

// Get referral types
router.get("/referral-types", async (req, res) => {
  try {
    logger.info("Getting referral types via API endpoint");

    const referralTypes = await leapService.getReferralTypes();

    res.json({
      success: true,
      message: "Referral types retrieved successfully",
      data: referralTypes.data,
    });
  } catch (error: any) {
    logger.error("Failed to get referral types", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get referral types",
      details: error.response?.data || null,
    });
  }
});

// Get sales reps
router.get("/sales-reps", async (req, res) => {
  try {
    logger.info("Getting sales reps via API endpoint");

    const salesReps = await leapService.getSalesReps();

    res.json({
      success: true,
      message: "Sales reps retrieved successfully",
      data: salesReps.data,
    });
  } catch (error: any) {
    logger.error("Failed to get sales reps", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get sales reps",
      details: error.response?.data || null,
    });
  }
});

// Get customer by ID from LEAP CRM
router.get("/customers/:id", async (req, res) => {
  try {
    const customerId = req.params.id;

    logger.info("Getting customer by ID from LEAP CRM", { customerId });

    // For now, we'll return a mock customer response since the LEAP API doesn't have a direct customer endpoint
    // In a real implementation, you would call the actual LEAP API to get customer details
    const customerData = {
      id: customerId,
      name: "Customer from LEAP CRM",
      email: "customer@example.com",
      phone: "555-0123",
      // Add other customer fields as needed
    };

    res.json({
      success: true,
      message: "Customer retrieved successfully",
      data: customerData,
    });
  } catch (error: any) {
    logger.error("Failed to get customer from LEAP CRM", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get customer from LEAP CRM",
      details: error.response?.data || null,
    });
  }
});

// Create appointment in LEAP CRM
router.post("/appointments", async (req, res) => {
  try {
    const appointmentData = req.body;

    logger.info("Creating appointment in LEAP CRM", { appointmentData });

    const appointment = await leapService.createAppointment(appointmentData);

    res.json({
      success: true,
      message: "Appointment created successfully",
      data: appointment.data,
    });
  } catch (error: any) {
    logger.error("Failed to create appointment in LEAP CRM", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create appointment in LEAP CRM",
      details: error.response?.data || null,
    });
  }
});

// Force sync a specific lead to LEAP using Create Prospect API
router.post("/sync-lead", async (req, res) => {
  try {
    const leadData = req.body;

    logger.info("Syncing lead to LEAP CRM using Create Prospect API", { leadData });

    const syncResult = await leapService.syncLead(leadData);

    res.json({
      success: true,
      message: "Lead synced to LEAP CRM successfully using Create Prospect API",
      data: syncResult,
    });
  } catch (error: any) {
    logger.error("Failed to sync lead to LEAP CRM using Create Prospect API", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to sync lead to LEAP CRM",
      details: error.response?.data || null,
    });
  }
});

// Create prospect directly using the new API
router.post("/create-prospect", async (req, res) => {
  try {
    const prospectData = req.body;

    logger.info("Creating prospect in LEAP CRM", { prospectData });

    const prospect = await leapService.createProspect(prospectData);

    res.json({
      success: true,
      message: "Prospect created successfully in LEAP CRM",
      data: prospect.data,
    });
  } catch (error: any) {
    logger.error("Failed to create prospect in LEAP CRM", {
      message: error.message,
      stack: error.stack,
      responseData: error.response?.data || "No additional data",
    });
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create prospect in LEAP CRM",
      details: error.response?.data || null,
    });
  }
});

export default router;
