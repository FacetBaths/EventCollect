import express from "express";
import { Lead, ILead } from "../models/Lead";
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
    
    // Set default eventName if not provided
    if (!leadData.eventName) {
      leadData.eventName = process.env.DEFAULT_EVENT_NAME || "Web Form Submission";
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

export default router;
