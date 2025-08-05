import express from "express";
import { Lead, ILead } from "../models/Lead";
import { Event } from "../models/Event";
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
    await newLead.save();
    
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
    
    res.status(201).json({ success: true, data: newLead });
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
    
    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, { new: true });
    
    if (!updatedLead) {
      return res.status(404).json({
        success: false,
        error: "Lead not found",
      });
    }
    
    logger.info("Lead updated successfully", { leadId, updateData });
    res.json({ success: true, data: updatedLead });
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
        appointmentDetails: lead.wantsAppointment ? {
          preferredDate: lead.appointmentDetails?.preferredDate || "",
          preferredTime: lead.appointmentDetails?.preferredTime || "",
          notes: lead.appointmentDetails?.notes || "",
        } : undefined,
        leadId: lead._id.toString(),
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

export default router;
