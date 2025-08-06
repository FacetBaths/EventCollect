import express from "express";
import mongoose from "mongoose";
import { Lead, ILead } from "../models/Lead";
import { Event } from "../models/Event";
import { Appointment } from "../models/Appointment";
import { leapService } from "../services/leapService";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/leads
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, data: leads });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        error: "Error retrieving leads",
        message: error.message,
      });
  }
});

// POST /api/leads
router.post("/", async (req, res) => {
  try {
    const leadData: ILead = req.body;
    
    // Set eventName from active event if not provided
    if (!leadData.eventName) {
      try {
        const activeEvent = await Event.findOne({ isActive: true });
        leadData.eventName = activeEvent?.name || "Web Form Submission";
      } catch (eventError: any) {
        logger.warn("Could not fetch active event, using default", {
          error: eventError.message
        });
        leadData.eventName = "Web Form Submission";
      }
    }
    
    // Default divisionId if not provided
    if (!leadData.divisionId) {
      leadData.divisionId = 6496; // Renovation division ID
    }

    const newLead = new Lead(leadData);
    const savedLead = await newLead.save();
    
    logger.info("Lead created successfully", { 
      leadId: savedLead._id,
      email: savedLead.email,
      wantsAppointment: savedLead.wantsAppointment
    });
    
    // Create appointment record immediately if customer wants an appointment
    let appointmentRecord = null;
    if (newLead.wantsAppointment && newLead.appointmentDetails) {
      try {
        logger.info("Creating appointment record for lead", { 
          leadId: newLead._id,
          preferredDate: newLead.appointmentDetails.preferredDate,
          preferredTime: newLead.appointmentDetails.preferredTime
        });
        
        appointmentRecord = new Appointment({
          leadId: (newLead._id as any).toString(),
          date: new Date(newLead.appointmentDetails.preferredDate),
          timeSlot: newLead.appointmentDetails.preferredTime,
          notes: newLead.appointmentDetails.notes || "",
          customerName: newLead.fullName,
          customerEmail: newLead.email,
          customerPhone: newLead.phone,
          status: "scheduled",
          address: {
            street: newLead.address.street,
            city: newLead.address.city,
            state: newLead.address.state,
            zipCode: newLead.address.zipCode,
          },
          servicesOfInterest: newLead.servicesOfInterest,
          tradeIds: newLead.tradeIds,
          salesRepId: newLead.salesRepId,
          eventName: newLead.eventName,
        });
        
        await appointmentRecord.save();
        
        logger.info("Appointment record created successfully", {
          leadId: newLead._id,
          appointmentId: appointmentRecord._id,
          date: appointmentRecord.date,
          timeSlot: appointmentRecord.timeSlot
        });
      } catch (appointmentError: any) {
        logger.error("Failed to create appointment record", {
          leadId: newLead._id,
          error: appointmentError.message,
          stack: appointmentError.stack,
        });
        // Continue with lead processing even if appointment creation fails
      }
    }
    
    // Automatically sync to LEAP if enabled
    if (process.env.ENABLE_LEAP_SYNC === "true") {
      try {
        logger.info("Syncing lead to LEAP CRM", { leadId: newLead._id });
        
        const syncResult = await leapService.syncLead({
          fullName: newLead.fullName,
          email: newLead.email,
          phone: newLead.phone,
          address: {
            street: newLead.address.street,
            city: newLead.address.city,
            state: newLead.address.state,
            zipCode: newLead.address.zipCode,
          },
          servicesOfInterest: newLead.servicesOfInterest,
          tradeIds: newLead.tradeIds,
          workTypeIds: newLead.workTypeIds,
          salesRepId: newLead.salesRepId,
          callCenterRepId: newLead.callCenterRepId,
          divisionId: newLead.divisionId || 6496, // Default to Renovation division
          tempRating: newLead.tempRating,
          notes: newLead.notes || "",
          eventName: newLead.eventName || "Web Form Submission",
          referredBy: (leadData as any).referredBy,
          referred_by_type: (leadData as any).referred_by_type,
          referred_by_id: (leadData as any).referred_by_id,
          referred_by_note: (leadData as any).referred_by_note,
          appointmentDetails: newLead.wantsAppointment ? {
            preferredDate: newLead.appointmentDetails?.preferredDate || "",
            preferredTime: newLead.appointmentDetails?.preferredTime || "",
            notes: newLead.appointmentDetails?.notes || "",
          } : undefined,
          leadId: (newLead._id as any).toString(), // Pass MongoDB ObjectID for job tracking
          leapCustomerId: newLead.leapCustomerId, // Pass existing LEAP customer ID if available
          leapJobId: newLead.leapJobId, // Pass existing LEAP job ID if available
        });
        
        // Update lead with LEAP sync results from Create Prospect API
        // The new API returns a single prospect with embedded customer and job data
        const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
        newLead.leapProspectId = prospectId?.toString();
        
        // For backward compatibility, also extract customer and job IDs if available
        const customerData = syncResult.data?.customer || syncResult.data;
        if (customerData?.id) {
          newLead.leapCustomerId = customerData.id.toString();
        }
        
        const jobData = syncResult.data?.job || syncResult.data;
        if (jobData?.id) {
          newLead.leapJobId = jobData.id.toString();
        }
        
        // Check if appointment was created (embedded in the prospect response)
        const appointmentData = syncResult.data?.appointment;
        if (appointmentData?.id) {
          newLead.leapAppointmentId = appointmentData.id.toString();
        }
        
        newLead.syncStatus = "synced";
        await newLead.save();
        
        logger.info("Lead synced to LEAP CRM successfully using Create Prospect API", { 
          leadId: newLead._id,
          prospectId: newLead.leapProspectId,
          customerId: newLead.leapCustomerId,
          jobId: newLead.leapJobId,
          appointmentId: newLead.leapAppointmentId,
        });
      } catch (syncError: any) {
        logger.error("Failed to sync lead to LEAP CRM", {
          leadId: newLead._id,
          error: syncError.message,
          stack: syncError.stack,
        });
        
        // Update lead with error status
        newLead.syncStatus = "error";
        newLead.syncError = syncError.message;
        await newLead.save();
      }
    }
    
    res.status(201).json({ 
      success: true, 
      data: newLead,
      appointmentCreated: appointmentRecord ? {
        id: appointmentRecord._id,
        date: appointmentRecord.date,
        timeSlot: appointmentRecord.timeSlot,
        status: appointmentRecord.status
      } : null
    });
  } catch (error: any) {
    logger.error("Error saving lead", {
      error: error.message,
      stack: error.stack,
    });
    
    res
      .status(500)
      .json({
        success: false,
        error: "Error saving lead",
        message: error.message,
      });
  }
});

// PUT /api/leads/:id
router.put("/:id", async (req, res) => {
  try {
    const leadId = req.params.id;
    const updateData = req.body;
    
    // Get the original lead before update to compare for sync needs
    const originalLead = await Lead.findById(leadId);
    if (!originalLead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }
    
    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, { new: true });
    
    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found after update",
      });
    }
    
    logger.info("Lead updated successfully", { leadId, updateData });
    
    // Check if only temperature rating changed (for optimized sync)
    const onlyTempChanged = (originalLead.tempRating !== updatedLead.tempRating) && 
      areLeadsEquivalentExceptTemp(originalLead, updatedLead);
    
    if (onlyTempChanged) {
      logger.info("Detected temperature-only change - will update job description", {
        leadId,
        oldTemp: originalLead.tempRating,
        newTemp: updatedLead.tempRating
      });
    }
    
    // Automatically sync to LEAP if enabled and lead has LEAP IDs (indicating it was previously synced)
    if (process.env.ENABLE_LEAP_SYNC === "true" && (updatedLead.leapCustomerId || updatedLead.leapJobId)) {
      try {
        if (onlyTempChanged && updatedLead.leapJobId && updatedLead.leapCustomerId) {
          // Use optimized temperature-only update
          logger.info("Using optimized temperature update for LEAP CRM", { 
            leadId,
            leapCustomerId: updatedLead.leapCustomerId,
            leapJobId: updatedLead.leapJobId,
            tempRating: updatedLead.tempRating
          });
          
          const syncResult = await leapService.instance.updateJobTemperature({
            leapJobId: updatedLead.leapJobId,
            leapCustomerId: updatedLead.leapCustomerId,
            tempRating: updatedLead.tempRating || 1,
            notes: updatedLead.notes,
            eventName: updatedLead.eventName,
            referredBy: updatedLead.referredBy,
            appointmentDetails: updatedLead.wantsAppointment ? {
              preferredDate: updatedLead.appointmentDetails?.preferredDate || "",
              preferredTime: updatedLead.appointmentDetails?.preferredTime || "",
              notes: updatedLead.appointmentDetails?.notes || "",
            } : undefined,
            leadId: updatedLead._id?.toString() || leadId,
            tradeIds: updatedLead.tradeIds,
            workTypeIds: updatedLead.workTypeIds,
            address: {
              street: updatedLead.address.street,
              city: updatedLead.address.city,
              state: updatedLead.address.state,
              zipCode: updatedLead.address.zipCode,
            },
            servicesOfInterest: updatedLead.servicesOfInterest
          });
          
          // Update lead status
          updatedLead.syncStatus = "synced";
          updatedLead.syncError = undefined;
          await updatedLead.save();
          
          logger.info("Temperature updated successfully in LEAP CRM", { 
            leadId,
            tempRating: updatedLead.tempRating,
            jobId: updatedLead.leapJobId
          });
          
        } else {
          // Use full sync for other changes
          logger.info("Auto-syncing updated lead to LEAP CRM", { 
            leadId,
            leapCustomerId: updatedLead.leapCustomerId,
            leapJobId: updatedLead.leapJobId
          });
          
          const syncResult = await leapService.syncLead({
          fullName: updatedLead.fullName,
          email: updatedLead.email,
          phone: updatedLead.phone,
          address: {
            street: updatedLead.address.street,
            city: updatedLead.address.city,
            state: updatedLead.address.state,
            zipCode: updatedLead.address.zipCode,
          },
          servicesOfInterest: updatedLead.servicesOfInterest,
          tradeIds: updatedLead.tradeIds,
          workTypeIds: updatedLead.workTypeIds,
          salesRepId: updatedLead.salesRepId,
          callCenterRepId: updatedLead.callCenterRepId,
          divisionId: updatedLead.divisionId || 6496,
          tempRating: updatedLead.tempRating,
          notes: updatedLead.notes || "",
          eventName: updatedLead.eventName || "Web Form Submission",
          referredBy: updatedLead.referredBy,
          referred_by_type: updatedLead.referred_by_type,
          referred_by_id: updatedLead.referred_by_id,
          referred_by_note: updatedLead.referred_by_note,
          appointmentDetails: updatedLead.wantsAppointment ? {
            preferredDate: updatedLead.appointmentDetails?.preferredDate || "",
            preferredTime: updatedLead.appointmentDetails?.preferredTime || "",
            notes: updatedLead.appointmentDetails?.notes || "",
          } : undefined,
          leadId: updatedLead._id?.toString() || leadId,
          leapCustomerId: updatedLead.leapCustomerId, // Pass existing LEAP customer ID for updates
          leapJobId: updatedLead.leapJobId, // Pass existing LEAP job ID for updates
        });
        
        // Debug log the sync result structure
        logger.info("LEAP Sync Result Structure for Lead Update", {
          leadId,
          syncResultData: syncResult.data,
          syncResultKeys: syncResult.data ? Object.keys(syncResult.data) : [],
          timestamp: new Date().toISOString()
        });
        
        // Update lead with sync results (including any new IDs if entities were recreated)
        const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
        if (prospectId) {
          updatedLead.leapProspectId = prospectId.toString();
        }
        
        // Handle both update responses and prospect creation responses
        const customerData = syncResult.data?.customer || syncResult.data;
        if (customerData?.id) {
          updatedLead.leapCustomerId = customerData.id.toString();
          logger.info("Extracted customer ID from customer.id", { customerId: customerData.id });
        }
        // Also check for customer_id field (from prospect creation)
        else if (syncResult.data?.customer_id) {
          updatedLead.leapCustomerId = syncResult.data.customer_id.toString();
          logger.info("Extracted customer ID from customer_id", { customerId: syncResult.data.customer_id });
        }
        
        const jobData = syncResult.data?.job || syncResult.data;
        if (jobData?.id) {
          updatedLead.leapJobId = jobData.id.toString();
          logger.info("Extracted job ID from job.id", { jobId: jobData.id });
        }
        // Also check for job_id field (from prospect creation)
        else if (syncResult.data?.job_id) {
          updatedLead.leapJobId = syncResult.data.job_id.toString();
          logger.info("Extracted job ID from job_id", { jobId: syncResult.data.job_id });
        }
        // Also check for job_ids array (from prospect creation)
        else if (syncResult.data?.job_ids && syncResult.data.job_ids.length > 0) {
          updatedLead.leapJobId = syncResult.data.job_ids[0].toString();
          logger.info("Extracted job ID from job_ids[0]", { jobId: syncResult.data.job_ids[0] });
        }
        
        updatedLead.syncStatus = "synced";
        updatedLead.syncError = undefined;
        await updatedLead.save();
        
        logger.info("Lead auto-synced to LEAP CRM successfully after update", { 
          leadId,
          prospectId: updatedLead.leapProspectId,
          customerId: updatedLead.leapCustomerId,
          jobId: updatedLead.leapJobId,
        });
        }
      } catch (syncError: any) {
        logger.error("Failed to auto-sync updated lead to LEAP CRM", {
          leadId,
          error: syncError.message,
          stack: syncError.stack,
          statusCode: syncError.statusCode,
          validationErrors: syncError.validationErrors
        });
        
        // Check if this is a validation error (412) - provide detailed feedback
        let detailedError = syncError.message;
        if (syncError.statusCode === 412 && syncError.validationErrors) {
          const errorDetails = Object.entries(syncError.validationErrors)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          detailedError = `LEAP CRM validation failed - ${errorDetails}`;
        }
        
        // Update lead with error status but don't fail the update request
        updatedLead.syncStatus = "error";
        updatedLead.syncError = detailedError;
        await updatedLead.save();
        
        // Add detailed sync error info to response but don't fail the request
        logger.warn("Lead update successful but sync failed - user can manually resync", {
          leadId,
          syncError: detailedError,
          isValidationError: syncError.statusCode === 412
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: updatedLead,
      syncAttempted: process.env.ENABLE_LEAP_SYNC === "true" && (updatedLead.leapCustomerId || updatedLead.leapJobId),
      syncStatus: updatedLead.syncStatus,
      syncError: updatedLead.syncError
    });
  } catch (error: any) {
    logger.error("Error updating lead", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error updating lead",
      message: error.message,
    });
  }
});

// DELETE /api/leads/:id
router.delete("/:id", async (req, res) => {
  try {
    const leadId = req.params.id;
    
    const deletedLead = await Lead.findByIdAndDelete(leadId);
    
    if (!deletedLead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }
    
    logger.info("Lead deleted successfully", { leadId, leadName: deletedLead.fullName });
    res.json({ 
      success: true, 
      message: `Lead "${deletedLead.fullName}" deleted successfully`,
      data: deletedLead 
    });
  } catch (error: any) {
    logger.error("Error deleting lead", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error deleting lead",
      message: error.message,
    });
  }
});

// POST /api/leads/:id/resync
router.post("/:id/resync", async (req, res) => {
  try {
    const leadId = req.params.id;
    
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }
    
    // Only resync if LEAP sync is enabled
    if (process.env.ENABLE_LEAP_SYNC !== "true") {
      return res.status(400).json({
        success: false,
        error: "LEAP sync is not enabled",
      });
    }
    
    try {
      logger.info("Resyncing lead to LEAP CRM", { leadId });
      
      const syncResult = await leapService.syncLead({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone,
        address: {
          street: lead.address.street,
          city: lead.address.city,
          state: lead.address.state,
          zipCode: lead.address.zipCode,
        },
        servicesOfInterest: lead.servicesOfInterest,
        tradeIds: lead.tradeIds,
        workTypeIds: lead.workTypeIds,
        salesRepId: lead.salesRepId,
        callCenterRepId: lead.callCenterRepId,
        divisionId: lead.divisionId || 6496,
        tempRating: lead.tempRating,
        notes: lead.notes || "",
        eventName: lead.eventName || "Web Form Submission",
        referredBy: lead.referredBy,
        referred_by_type: lead.referred_by_type,
        referred_by_id: lead.referred_by_id,
        referred_by_note: lead.referred_by_note,
        appointmentDetails: lead.wantsAppointment ? {
          preferredDate: lead.appointmentDetails?.preferredDate || "",
          preferredTime: lead.appointmentDetails?.preferredTime || "",
          notes: lead.appointmentDetails?.notes || "",
        } : undefined,
        leadId: lead._id?.toString() || leadId,
        leapCustomerId: lead.leapCustomerId, // Pass existing LEAP customer ID if available
        leapJobId: lead.leapJobId, // Pass existing LEAP job ID if available
      });
      
      // Update lead with sync results
      const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
      lead.leapProspectId = prospectId?.toString();
      
      const customerData = syncResult.data?.customer || syncResult.data;
      if (customerData?.id) {
        lead.leapCustomerId = customerData.id.toString();
      }
      
      const jobData = syncResult.data?.job || syncResult.data;
      if (jobData?.id) {
        lead.leapJobId = jobData.id.toString();
      }
      
      lead.syncStatus = "synced";
      lead.syncError = undefined;
      await lead.save();
      
      logger.info("Lead resynced to LEAP CRM successfully", { 
        leadId,
        prospectId: lead.leapProspectId,
      });
      
      res.json({ 
        success: true, 
        message: "Lead resynced successfully",
        data: lead 
      });
    } catch (syncError: any) {
      logger.error("Failed to resync lead to LEAP CRM", {
        leadId,
        error: syncError.message,
        stack: syncError.stack,
      });
      
      // Update lead with error status
      lead.syncStatus = "error";
      lead.syncError = syncError.message;
      await lead.save();
      
      res.status(500).json({
        success: false,
        error: "Failed to resync lead to LEAP CRM",
        message: syncError.message,
        data: lead
      });
    }
  } catch (error: any) {
    logger.error("Error resyncing lead", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error resyncing lead",
      message: error.message,
    });
  }
});

// POST /api/leads/:id/appointment-preferences - Save appointment preferences immediately
router.post("/:id/appointment-preferences", async (req, res) => {
  try {
    const leadId = req.params.id;
    const { preferredDate, preferredTime, notes } = req.body;
    
    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }
    
    // Create or update appointment document
    let appointment = await Appointment.findOne({ leadId: leadId });
    
    if (appointment) {
      // Update existing appointment
      appointment.date = preferredDate;
      appointment.timeSlot = preferredTime;
      appointment.notes = notes || "";
      appointment.customerName = lead.fullName;
      appointment.customerEmail = lead.email;
      appointment.customerPhone = lead.phone;
      appointment.status = "scheduled";
      // updatedAt is handled automatically by mongoose timestamps
      
      await appointment.save();
      logger.info("Appointment preferences updated", { leadId, appointmentId: appointment._id });
    } else {
      // Create new appointment
      appointment = new Appointment({
        leadId: leadId,
        date: preferredDate,
        timeSlot: preferredTime,
        notes: notes || "",
        customerName: lead.fullName,
        customerEmail: lead.email,
        customerPhone: lead.phone,
        status: "scheduled",
        address: {
          street: lead.address.street,
          city: lead.address.city,
          state: lead.address.state,
          zipCode: lead.address.zipCode,
        },
        servicesOfInterest: lead.servicesOfInterest,
        tradeIds: lead.tradeIds,
        salesRepId: lead.salesRepId,
        eventName: lead.eventName,
        // createdAt and updatedAt are handled automatically by mongoose timestamps
      });
      
      await appointment.save();
      logger.info("Appointment preferences saved", { leadId, appointmentId: appointment._id });
    }
    
    // Update lead with appointment details and mark as wanting appointment
    lead.wantsAppointment = true;
    lead.appointmentDetails = {
      preferredDate,
      preferredTime,
      notes: notes || "",
    };
    await lead.save();
    
    res.json({
      success: true,
      message: "Appointment preferences saved successfully",
      data: {
        appointment,
        lead: {
          id: lead._id,
          fullName: lead.fullName,
          wantsAppointment: lead.wantsAppointment,
          appointmentDetails: lead.appointmentDetails,
        },
      },
    });
  } catch (error: any) {
    logger.error("Error saving appointment preferences", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error saving appointment preferences",
      message: error.message,
    });
  }
});

// POST /api/leads/sync-pending - Bulk sync all pending leads
router.post("/sync-pending", async (req, res) => {
  try {
    // Only sync if LEAP sync is enabled
    if (process.env.ENABLE_LEAP_SYNC !== "true") {
      return res.status(400).json({
        success: false,
        error: "LEAP sync is not enabled",
      });
    }
    
    // Find all pending leads
    const pendingLeads = await Lead.find({ syncStatus: "pending" });
    
    if (pendingLeads.length === 0) {
      return res.json({
        success: true,
        message: "No pending leads to sync",
        data: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }
    
    logger.info(`Starting bulk sync of ${pendingLeads.length} pending leads`);
    
    const results = {
      totalProcessed: pendingLeads.length,
      successful: 0,
      failed: 0,
      results: [] as any[]
    };
    
    // Process each lead
    for (const lead of pendingLeads) {
      try {
        logger.info("Syncing pending lead to LEAP CRM", { leadId: lead._id });
        
        const syncResult = await leapService.syncLead({
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          address: {
            street: lead.address.street,
            city: lead.address.city,
            state: lead.address.state,
            zipCode: lead.address.zipCode,
          },
          servicesOfInterest: lead.servicesOfInterest,
          tradeIds: lead.tradeIds,
          workTypeIds: lead.workTypeIds,
          salesRepId: lead.salesRepId,
          callCenterRepId: lead.callCenterRepId,
          divisionId: lead.divisionId || 6496,
          tempRating: lead.tempRating,
          notes: lead.notes || "",
          eventName: lead.eventName || "Web Form Submission",
          referredBy: lead.referredBy,
          referred_by_type: lead.referred_by_type,
          referred_by_id: lead.referred_by_id,
          referred_by_note: lead.referred_by_note,
          appointmentDetails: lead.wantsAppointment ? {
            preferredDate: lead.appointmentDetails?.preferredDate || "",
            preferredTime: lead.appointmentDetails?.preferredTime || "",
            notes: lead.appointmentDetails?.notes || "",
          } : undefined,
          leadId: lead._id?.toString() || lead._id,
          leapCustomerId: lead.leapCustomerId, // Pass existing LEAP customer ID if available
          leapJobId: lead.leapJobId, // Pass existing LEAP job ID if available
        });
        
        // Update lead with sync results
        const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
        lead.leapProspectId = prospectId?.toString();
        
        const customerData = syncResult.data?.customer || syncResult.data;
        if (customerData?.id) {
          lead.leapCustomerId = customerData.id.toString();
        }
        
        const jobData = syncResult.data?.job || syncResult.data;
        if (jobData?.id) {
          lead.leapJobId = jobData.id.toString();
        }
        
        lead.syncStatus = "synced";
        lead.syncError = undefined;
        await lead.save();
        
        results.successful++;
        results.results.push({
          leadId: lead._id,
          leadName: lead.fullName,
          status: "success",
          prospectId: lead.leapProspectId
        });
        
        logger.info("Pending lead synced successfully", { 
          leadId: lead._id,
          prospectId: lead.leapProspectId,
        });
      } catch (syncError: any) {
        logger.error("Failed to sync pending lead", {
          leadId: lead._id,
          error: syncError.message,
          stack: syncError.stack,
        });
        
        // Update lead with error status
        lead.syncStatus = "error";
        lead.syncError = syncError.message;
        await lead.save();
        
        results.failed++;
        results.results.push({
          leadId: lead._id,
          leadName: lead.fullName,
          status: "error",
          error: syncError.message
        });
      }
    }
    
    logger.info("Bulk sync completed", {
      totalProcessed: results.totalProcessed,
      successful: results.successful,
      failed: results.failed
    });
    
    const hasErrors = results.failed > 0;
    res.status(hasErrors ? 207 : 200).json({ // 207 = Multi-Status for partial success
      success: results.successful > 0,
      message: `Bulk sync completed: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    logger.error("Error in bulk sync operation", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error during bulk sync operation",
      message: error.message,
    });
  }
});


function areLeadsEquivalentExceptTemp(leadA: ILead, leadB: ILead): boolean {
  // Create copies to avoid modifying original objects
  const cleanA = JSON.parse(JSON.stringify(leadA));
  const cleanB = JSON.parse(JSON.stringify(leadB));

  // Remove fields that should be ignored during comparison
  delete cleanA.tempRating;
  delete cleanB.tempRating;
  delete cleanA.updatedAt;
  delete cleanB.updatedAt;
  delete cleanA.syncStatus;
  delete cleanB.syncStatus;
  delete cleanA.syncError;
  delete cleanB.syncError;

  // Compare the sanitized objects
  return JSON.stringify(cleanA) === JSON.stringify(cleanB);
}

export default router;
