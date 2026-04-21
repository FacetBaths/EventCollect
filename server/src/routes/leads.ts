import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Lead, ILead } from "../models/Lead";
import { Event } from "../models/Event";
import { Appointment } from "../models/Appointment";
import { leapService } from "../services/leapService";
import { appointmentService } from "../services/appointmentService";
import { logger } from "../utils/logger";
import { parseFacebookCsv, ParsedLead } from "../utils/csvUtils";
import type { AuthRequest } from "../middleware/auth";

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// POST /api/leads/preview-csv - Preview Facebook leads from CSV before import
router.post("/preview-csv", upload.single('csvFile') as any, async (req, res) => {
  let tempFilePath: string | undefined;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No CSV file uploaded",
      });
    }

    tempFilePath = req.file.path;
    logger.info("Previewing CSV file", { 
      filename: req.file.originalname, 
      size: req.file.size 
    });

    // Parse CSV file
    const parsedLeads = await parseFacebookCsv(tempFilePath);
    
    if (parsedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid leads found in CSV file",
      });
    }

    // Get LEAP data for dropdowns
    let leapData = {
      salesReps: [] as any[],
      trades: [] as any[],
      divisions: [] as any[],
      referralSources: [] as any[]
    };
    
    if (process.env.ENABLE_LEAP_SYNC === "true") {
      try {
        const [salesRepsResponse, tradesResponse, divisionsResponse, referralSourcesResponse] = await Promise.all([
          leapService.getSalesReps(),
          leapService.getCompanyTrades(),
          leapService.getDivisions(),
          leapService.getReferralTypes()
        ]);
        
        leapData.salesReps = salesRepsResponse?.data || [];
        leapData.trades = tradesResponse?.data || [];
        leapData.divisions = divisionsResponse?.data || [];
        leapData.referralSources = referralSourcesResponse?.data || [];
      } catch (leapError: any) {
        logger.warn("Could not fetch LEAP data for preview", { error: leapError.message });
      }
    }

    res.json({
      success: true,
      message: `Found ${parsedLeads.length} leads in CSV file`,
      data: {
        leads: parsedLeads,
        leapData,
        filename: req.file.originalname
      }
    });
  } catch (error: any) {
    logger.error("Error previewing CSV file", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error processing CSV file",
      message: error.message,
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.info("Cleaned up temporary CSV preview file", { path: tempFilePath });
    }
  }
});

// POST /api/leads/import-from-preview - Import leads from preview data (after user edits)
router.post("/import-from-preview", async (req, res) => {
  try {
    const { leads, enableLeapSync } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No leads data provided",
      });
    }

    logger.info("Importing leads from preview", { count: leads.length });

    const results = {
      totalProcessed: leads.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      importedLeads: [] as any[]
    };

    // Get or create "Facebook Lead Ad" event
    let facebookEvent;
    try {
      facebookEvent = await Event.findOne({ name: "Facebook Lead Ad" });
      if (!facebookEvent) {
        facebookEvent = new Event({
          name: "Facebook Lead Ad",
          description: "Leads imported from Facebook Lead Ads",
          date: new Date(),
          location: "Online",
          isActive: false
        });
        await facebookEvent.save();
        logger.info("Created Facebook Lead Ad event", { eventId: facebookEvent._id });
      }
    } catch (eventError: any) {
      logger.warn("Could not create/find Facebook event", { error: eventError.message });
    }

    // Get referral sources for mapping referral IDs to names
    let referralSourcesMap = new Map();
    if (process.env.ENABLE_LEAP_SYNC === "true") {
      try {
        const referralSourcesResponse = await leapService.getReferralTypes();
        if (referralSourcesResponse?.data) {
          referralSourcesResponse.data.forEach((source: any) => {
            referralSourcesMap.set(source.id, source.name);
          });
        }
      } catch (error: any) {
        logger.warn("Could not fetch referral sources for mapping", { error: error.message });
      }
    }

    // Process each lead
    for (const leadData of leads) {
      try {
        // Set event information
        if (facebookEvent) {
          leadData.eventName = facebookEvent.name;
        }
        
        // Apply referral source information if provided
        if (leadData.referralSourceId) {
          const referralSourceName = referralSourcesMap.get(leadData.referralSourceId);
          leadData.referredBy = referralSourceName || 'Unknown Source';
          leadData.referred_by_type = referralSourceName || 'Unknown Source';
          leadData.referred_by_id = leadData.referralSourceId;
          // Update the referral note to include the source name
          const originalNote = leadData.referred_by_note || 'Lead Form';
          leadData.referred_by_note = `${referralSourceName || 'Unknown Source'} - ${originalNote}`;
        }

        const newLead = new Lead({
          ...leadData,
          syncStatus: "pending",
        });
        const savedLead = await newLead.save();
        
        logger.info("Facebook lead imported successfully", { 
          leadId: savedLead._id,
          email: savedLead.email,
          name: savedLead.fullName
        });
        
        // Automatically sync to LEAP if enabled and allowed by batch setting
        if (process.env.ENABLE_LEAP_SYNC === "true" && enableLeapSync !== false) {
          try {
            const syncResult = await leapService.syncLead({
              fullName: newLead.fullName,
              email: newLead.email,
              phone: newLead.phone,
              address: newLead.address,
              servicesOfInterest: newLead.servicesOfInterest,
              tradeIds: newLead.tradeIds,
              workTypeIds: newLead.workTypeIds,
              salesRepId: newLead.salesRepId,
              callCenterRepId: newLead.callCenterRepId,
              divisionId: newLead.divisionId || 6496,
              tempRating: newLead.tempRating,
              notes: newLead.notes || "",
              eventName: newLead.eventName || "Facebook Lead Ad",
              referredBy: newLead.referredBy,
              referred_by_type: newLead.referred_by_type,
              referred_by_id: newLead.referred_by_id,
              referred_by_note: newLead.referred_by_note,
              appointmentDetails: newLead.wantsAppointment ? {
                preferredDate: newLead.appointmentDetails?.preferredDate || "",
                preferredTime: newLead.appointmentDetails?.preferredTime || "",
                notes: newLead.appointmentDetails?.notes || "",
              } : undefined,
              leadId: newLead._id?.toString(),
              leapCustomerId: newLead.leapCustomerId,
              leapJobId: newLead.leapJobId,
            });
            
            // Update lead with LEAP sync results
            const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
            newLead.leapProspectId = prospectId?.toString();
            
            const customerData = syncResult.data?.customer || syncResult.data;
            if (customerData?.id) {
              newLead.leapCustomerId = customerData.id.toString();
            }
            
            const jobData = syncResult.data?.job || syncResult.data;
            if (jobData?.id) {
              newLead.leapJobId = jobData.id.toString();
            }
            
            newLead.syncStatus = "synced";
            await newLead.save();
            
            logger.info("Facebook lead synced to LEAP successfully", { 
              leadId: newLead._id,
              prospectId: newLead.leapProspectId,
            });
          } catch (syncError: any) {
            logger.error("Failed to sync Facebook lead to LEAP", {
              leadId: newLead._id,
              error: syncError.message,
            });
            
            newLead.syncStatus = "error";
            newLead.syncError = syncError.message;
            await newLead.save();
          }
        }
        
        results.successful++;
        results.importedLeads.push({
          id: savedLead._id,
          name: savedLead.fullName,
          email: savedLead.email,
          syncStatus: savedLead.syncStatus
        });
      } catch (error: any) {
        logger.error("Failed to import Facebook lead", {
          leadData,
          error: error.message,
        });
        
        results.failed++;
        results.errors.push(`${leadData.fullName || leadData.email}: ${error.message}`);
      }
    }

    logger.info("Import from preview completed", {
      totalProcessed: results.totalProcessed,
      successful: results.successful,
      failed: results.failed
    });

    const hasErrors = results.failed > 0;
    res.status(hasErrors ? 207 : 200).json({ // 207 = Multi-Status for partial success
      success: results.successful > 0,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    logger.error("Error during import from preview", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error importing leads",
      message: error.message,
    });
  }
});

// POST /api/leads/import-csv - Import Facebook leads from CSV
router.post("/import-csv", upload.single('csvFile') as any, async (req, res) => {
  let tempFilePath: string | undefined;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No CSV file uploaded",
      });
    }

    tempFilePath = req.file.path;
    logger.info("Processing CSV import", { 
      filename: req.file.originalname, 
      size: req.file.size 
    });

    // Parse CSV file
    const parsedLeads = await parseFacebookCsv(tempFilePath);
    
    if (parsedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid leads found in CSV file",
      });
    }

    const results = {
      totalProcessed: parsedLeads.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      importedLeads: [] as any[]
    };

    // Get or create "Facebook Lead Ad" event
    let facebookEvent;
    try {
      facebookEvent = await Event.findOne({ name: "Facebook Lead Ad" });
      if (!facebookEvent) {
        facebookEvent = new Event({
          name: "Facebook Lead Ad",
          description: "Leads imported from Facebook Lead Ads",
          date: new Date(),
          location: "Online",
          isActive: false
        });
        await facebookEvent.save();
        logger.info("Created Facebook Lead Ad event", { eventId: facebookEvent._id });
      }
    } catch (eventError: any) {
      logger.warn("Could not create/find Facebook event", { error: eventError.message });
    }

    // Process each parsed lead
    for (const parsedLead of parsedLeads) {
      try {
        // Set event information
        if (facebookEvent) {
          parsedLead.eventName = facebookEvent.name;
        }

        const leadData: ILead = {
          ...parsedLead,
          divisionId: 6496, // Default to Renovation division
          syncStatus: "pending",
        } as ILead;

        const newLead = new Lead(leadData);
        const savedLead = await newLead.save();
        
        logger.info("Facebook lead imported successfully", { 
          leadId: savedLead._id,
          email: savedLead.email,
          name: savedLead.fullName
        });
        
        // Automatically sync to LEAP if enabled
        if (process.env.ENABLE_LEAP_SYNC === "true") {
          try {
            const syncResult = await leapService.syncLead({
              fullName: newLead.fullName,
              email: newLead.email,
              phone: newLead.phone,
              address: newLead.address,
              servicesOfInterest: newLead.servicesOfInterest,
              tradeIds: newLead.tradeIds,
              workTypeIds: newLead.workTypeIds,
              salesRepId: newLead.salesRepId,
              callCenterRepId: newLead.callCenterRepId,
              divisionId: newLead.divisionId || 6496,
              tempRating: newLead.tempRating,
              notes: newLead.notes || "",
              eventName: newLead.eventName || "Facebook Lead Ad",
              referredBy: newLead.referredBy,
              referred_by_type: newLead.referred_by_type,
              referred_by_id: newLead.referred_by_id,
              referred_by_note: newLead.referred_by_note,
              appointmentDetails: newLead.wantsAppointment ? {
                preferredDate: newLead.appointmentDetails?.preferredDate || "",
                preferredTime: newLead.appointmentDetails?.preferredTime || "",
                notes: newLead.appointmentDetails?.notes || "",
              } : undefined,
              leadId: newLead._id?.toString(),
              leapCustomerId: newLead.leapCustomerId,
              leapJobId: newLead.leapJobId,
            });
            
            // Update lead with LEAP sync results
            const prospectId = syncResult.data?.id || syncResult.data?.prospect?.id;
            newLead.leapProspectId = prospectId?.toString();
            
            const customerData = syncResult.data?.customer || syncResult.data;
            if (customerData?.id) {
              newLead.leapCustomerId = customerData.id.toString();
            }
            
            const jobData = syncResult.data?.job || syncResult.data;
            if (jobData?.id) {
              newLead.leapJobId = jobData.id.toString();
            }
            
            newLead.syncStatus = "synced";
            await newLead.save();
            
            logger.info("Facebook lead synced to LEAP successfully", { 
              leadId: newLead._id,
              prospectId: newLead.leapProspectId,
            });
          } catch (syncError: any) {
            logger.error("Failed to sync Facebook lead to LEAP", {
              leadId: newLead._id,
              error: syncError.message,
            });
            
            newLead.syncStatus = "error";
            newLead.syncError = syncError.message;
            await newLead.save();
          }
        }
        
        results.successful++;
        results.importedLeads.push({
          id: savedLead._id,
          name: savedLead.fullName,
          email: savedLead.email,
          syncStatus: savedLead.syncStatus
        });
      } catch (error: any) {
        logger.error("Failed to import Facebook lead", {
          leadData: parsedLead,
          error: error.message,
        });
        
        results.failed++;
        results.errors.push(`${parsedLead.fullName || parsedLead.email}: ${error.message}`);
      }
    }

    logger.info("CSV import completed", {
      filename: req.file.originalname,
      totalProcessed: results.totalProcessed,
      successful: results.successful,
      failed: results.failed
    });

    const hasErrors = results.failed > 0;
    res.status(hasErrors ? 207 : 200).json({ // 207 = Multi-Status for partial success
      success: results.successful > 0,
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    logger.error("Error during CSV import", {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error processing CSV file",
      message: error.message,
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.info("Cleaned up temporary CSV file", { path: tempFilePath });
    }
  }
});

// GET /api/leads/stats — read-only aggregation, must be before /:id routes
router.get("/stats", async (req, res) => {
  try {
    const { eventName, date } = req.query;

    // "today" window: use date from client (YYYY-MM-DD) to honour their timezone
    const dateStr = (date as string) || new Date().toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const todayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

    const eventFilter: Record<string, any> = eventName
      ? { eventName: eventName as string }
      : {};

    const pipeline = (matchExtra: Record<string, any>) => Lead.aggregate([
      { $match: { ...eventFilter, ...matchExtra } },
      { $group: {
        _id: null,
        entries:      { $sum: 1 },
        appointments: { $sum: { $cond: [{ $eq: ['$wantsAppointment', true] }, 1, 0] } }
      }}
    ]);

    const [todayResult, totalResult] = await Promise.all([
      pipeline({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      pipeline({})
    ]);

    const shape = (r: any[]) => r[0]
      ? { entries: r[0].entries, appointments: r[0].appointments, leads: r[0].entries - r[0].appointments }
      : { entries: 0, appointments: 0, leads: 0 };

    res.json({
      success: true,
      data: { today: shape(todayResult), total: shape(totalResult) }
    });
  } catch (error: any) {
    logger.error("Error fetching lead stats", { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

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
    // Capture authenticated user as lead creator
    const authUser = (req as AuthRequest).user;
    if (authUser) {
      (leadData as any).createdBy = (authUser._id as any).toString();
    }
    
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

    if (typeof leadData.eventName === "string") {
      leadData.eventName = leadData.eventName.trim();
    }
    leadData.referredBy = leadData.eventName || "";
    leadData.referred_by_type = "Event";
    leadData.referred_by_id = 8;
    leadData.referred_by_note = leadData.eventName || "";

    const newLead = new Lead(leadData);
    const savedLead = await newLead.save();
    
    logger.info("Lead created successfully", { 
      leadId: savedLead._id,
      email: savedLead.email,
      wantsAppointment: savedLead.wantsAppointment
    });
    
    // Create appointment using appointment service API if customer wants an appointment
    let appointmentRecord = null;
    if (newLead.wantsAppointment && newLead.appointmentDetails) {
      try {
        logger.info("Creating appointment via appointment service for lead", { 
          leadId: newLead._id,
          preferredDate: newLead.appointmentDetails.preferredDate,
          preferredTime: newLead.appointmentDetails.preferredTime
        });
        
        const appointmentData = {
          leadId: (newLead._id as any).toString(),
          customerName: newLead.fullName,
          customerEmail: newLead.email,
          customerPhone: newLead.phone,
          date: new Date(newLead.appointmentDetails.preferredDate), // Parse date string to Date object
          timeSlot: newLead.appointmentDetails.preferredTime,
          address: {
            street: newLead.address.street,
            city: newLead.address.city,
            state: newLead.address.state,
            zipCode: newLead.address.zipCode,
          },
          servicesOfInterest: newLead.servicesOfInterest,
          notes: newLead.appointmentDetails.notes || "",
          tradeIds: newLead.tradeIds,
          salesRepId: newLead.salesRepId,
          eventName: newLead.eventName,
          createdBy: authUser ? (authUser._id as any).toString() : "lead-form"
        };
        
        // Use appointmentService to create appointment (handles availability checking)
        appointmentRecord = await appointmentService.createAppointment(appointmentData);
        
        logger.info("Appointment created successfully via appointment service", {
          leadId: newLead._id,
          appointmentId: appointmentRecord._id,
          date: appointmentRecord.date,
          timeSlot: appointmentRecord.timeSlot
        });
      } catch (appointmentError: any) {
        logger.error("Failed to create appointment via appointment service", {
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
        
        // Update lead with LEAP sync results using normalized fields
        const prospectId = syncResult.data?.prospect_id || syncResult.data?.id;
        if (prospectId) {
          newLead.leapProspectId = prospectId.toString();
        }
        
        // Use normalized customer_id field
        const customerId = syncResult.data?.customer_id || syncResult.data?.customer?.id;
        if (customerId) {
          newLead.leapCustomerId = customerId.toString();
        }
        
        // Use normalized job_id field with fallback to job_ids array
        const jobId = syncResult.data?.job_id || 
                     (syncResult.data?.job_ids && syncResult.data.job_ids[0]) || 
                     syncResult.data?.job?.id;
        if (jobId) {
          newLead.leapJobId = jobId.toString();
        }
        
        // Check if appointment was created (embedded in the prospect response)
        const appointmentData = syncResult.data?.appointment;
        if (appointmentData?.id) {
          newLead.leapAppointmentId = appointmentData.id.toString();
        }
        
        // Create appointment in LEAP if lead has appointment details and we have a job ID
        if (newLead.wantsAppointment && newLead.appointmentDetails && jobId && appointmentRecord) {
          try {
            logger.info("Creating appointment in LEAP CRM", {
              leadId: newLead._id,
              jobId,
              appointmentDate: newLead.appointmentDetails.preferredDate,
              appointmentTime: newLead.appointmentDetails.preferredTime
            });
            
            // Convert timeSlot format from "10:00 AM" to LEAP format
            const convertToLeapTime = (timeSlot: string): string => {
              // LEAP typically expects 24-hour format like "10:00" or "14:00"
              const [time, period] = timeSlot.split(' ');
              const [hours, minutes] = time.split(':');
              let hour24 = parseInt(hours);
              
              if (period === 'PM' && hour24 !== 12) {
                hour24 += 12;
              } else if (period === 'AM' && hour24 === 12) {
                hour24 = 0;
              }
              
              return `${hour24.toString().padStart(2, '0')}:${minutes}`;
            };
            
            const leapAppointmentData = {
              job_id: jobId,
              date: newLead.appointmentDetails.preferredDate,
              start_time: convertToLeapTime(newLead.appointmentDetails.preferredTime),
              end_time: convertToLeapTime(newLead.appointmentDetails.preferredTime), // Same as start for now
              notes: newLead.appointmentDetails.notes || `Appointment for ${newLead.fullName}`,
              status: "scheduled"
            };
            
            const leapAppointmentResult = await leapService.createAppointment(leapAppointmentData);
            
            if (leapAppointmentResult.success && leapAppointmentResult.data?.id) {
              newLead.leapAppointmentId = leapAppointmentResult.data.id.toString();
              logger.info("LEAP appointment created successfully", {
                leadId: newLead._id,
                leapAppointmentId: newLead.leapAppointmentId,
                jobId
              });
            }
          } catch (appointmentError: any) {
            logger.error("Failed to create LEAP appointment", {
              leadId: newLead._id,
              jobId,
              error: appointmentError.message,
              stack: appointmentError.stack
            });
            // Don't fail the whole process if LEAP appointment creation fails
          }
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

    const normalizedEventName =
      typeof updateData.eventName === "string"
        ? updateData.eventName.trim()
        : originalLead.eventName || "";

    updateData.eventName = normalizedEventName;
    updateData.referredBy = normalizedEventName;
    updateData.referred_by_type = "Event";
    updateData.referred_by_id = 8;
    updateData.referred_by_note = normalizedEventName;
    
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
          const strictUpdateMode = process.env.LEAP_STRICT_UPDATE_MODE !== "false";
          
          logger.info("Auto-syncing updated lead to LEAP CRM", { 
            leadId,
            leapCustomerId: updatedLead.leapCustomerId,
            leapJobId: updatedLead.leapJobId,
            strictUpdateMode
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
        }, {
          mode: "update",
          allowProspectCreateOnMissing: !strictUpdateMode
        });
        
        // Debug log the sync result structure
        logger.info("LEAP Sync Result Structure for Lead Update", {
          leadId,
          syncResultData: syncResult.data,
          syncResultKeys: syncResult.data ? Object.keys(syncResult.data) : [],
          timestamp: new Date().toISOString()
        });
        
        // Update lead with sync results using normalized fields
        const prospectId = syncResult.data?.prospect_id || syncResult.data?.id;
        if (prospectId) {
          updatedLead.leapProspectId = prospectId.toString();
        }
        
        // Use normalized customer_id field
        const customerId = syncResult.data?.customer_id || syncResult.data?.customer?.id;
        if (customerId) {
          updatedLead.leapCustomerId = customerId.toString();
          logger.info("Extracted customer ID from normalized response", { customerId });
        }
        
        // Use normalized job_id field with fallback to job_ids array
        const jobId = syncResult.data?.job_id || 
                     (syncResult.data?.job_ids && syncResult.data.job_ids[0]) || 
                     syncResult.data?.job?.id;
        if (jobId) {
          updatedLead.leapJobId = jobId.toString();
          logger.info("Extracted job ID from normalized response", { jobId });
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
      const strictUpdateMode = process.env.LEAP_STRICT_UPDATE_MODE !== "false";
      
      logger.info("Resyncing lead to LEAP CRM", { 
        leadId,
        strictUpdateMode 
      });
      
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
      }, {
        mode: "update",
        allowProspectCreateOnMissing: !strictUpdateMode
      });
      
      // Update lead with sync results using normalized fields
      const prospectId = syncResult.data?.prospect_id || syncResult.data?.id;
      if (prospectId) {
        lead.leapProspectId = prospectId.toString();
      }
      
      // Use normalized customer_id field
      const customerId = syncResult.data?.customer_id || syncResult.data?.customer?.id;
      if (customerId) {
        lead.leapCustomerId = customerId.toString();
      }
      
      // Use normalized job_id field with fallback to job_ids array
      const jobId = syncResult.data?.job_id || 
                   (syncResult.data?.job_ids && syncResult.data.job_ids[0]) || 
                   syncResult.data?.job?.id;
      if (jobId) {
        lead.leapJobId = jobId.toString();
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
        
        // Update lead with sync results using normalized fields
        const prospectId = syncResult.data?.prospect_id || syncResult.data?.id;
        if (prospectId) {
          lead.leapProspectId = prospectId.toString();
        }
        
        // Use normalized customer_id field
        const customerId = syncResult.data?.customer_id || syncResult.data?.customer?.id;
        if (customerId) {
          lead.leapCustomerId = customerId.toString();
        }
        
        // Use normalized job_id field with fallback to job_ids array
        const jobId = syncResult.data?.job_id || 
                     (syncResult.data?.job_ids && syncResult.data.job_ids[0]) || 
                     syncResult.data?.job?.id;
        if (jobId) {
          lead.leapJobId = jobId.toString();
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
