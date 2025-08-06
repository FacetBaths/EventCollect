import axios, { AxiosResponse, AxiosInstance } from "axios";
import { logger } from "../utils/logger";
import { appointmentService } from "./appointmentService";

// LEAP API Types based on your existing API
interface LeapCustomer {
  id?: string | number;
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phones: {
    number: string;
    type: "home" | "work" | "mobile" | "other";
    label: string;
    primary?: boolean;
  }[];
  addresses: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  }[];
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

interface LeapJob {
  id?: string | number;
  number?: string;
  customer_id: string | number;
  name: string;
  description?: string;
  status: "new" | "in_progress" | "on_hold" | "completed" | "cancelled";
  start_date?: string;
  end_date?: string;
  address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  total_amount?: number;
  paid_amount?: number;
  referral_source?: string; // This is where we'll put the event name
  created_at?: string;
  updated_at?: string;
}

interface LeapAppointment {
  id?: string | number;
  job_id: string | number;
  date: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
  created_at?: string;
  updated_at?: string;
}

interface LeapApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  status: number;
}

export class LeapService {
  private apiClient: AxiosInstance;
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl =
      process.env.LEAP_API_BASE_URL || "https://api.jobprogress.com/api/v3";
    this.apiToken = process.env.LEAP_API_TOKEN || "";

    if (!this.apiToken) {
      throw new Error("LEAP_API_TOKEN environment variable is required");
    }

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: parseInt(process.env.LEAP_API_TIMEOUT || "30000"),
      headers: {
        Authorization: this.apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config: any) => {
        logger.debug(
          `LEAP API Request: ${config.method?.toUpperCase()} ${config.url}`,
          {
            data: config.data,
            params: config.params,
            timestamp: new Date().toISOString(),
          },
        );
        return config;
      },
      (error: any) => {
        logger.error("LEAP API Request Error:", error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.apiClient.interceptors.response.use(
      (response: any) => {
        logger.debug(
          `LEAP API Response: ${response.status} ${response.config.url}`,
          {
            data: response.data,
          },
        );
        return response;
      },
      (error: any) => {
        logger.error("LEAP API Response Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a new customer in LEAP CRM
   */
  async createCustomer(
    customerData: Partial<LeapCustomer>,
  ): Promise<LeapApiResponse<LeapCustomer>> {
    try {
      logger.info("Creating customer in LEAP CRM", { customerData });

      const response: AxiosResponse = await this.apiClient.post(
        "/customers",
        customerData,
      );

      logger.info("Customer created successfully in LEAP CRM", {
        customerId: response.data.data?.id,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Customer created successfully",
      };
    } catch (error: any) {
      logger.error("Failed to create customer in LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Update an existing customer in LEAP CRM
   */
  async updateCustomer(
    customerId: string | number,
    customerData: Partial<LeapCustomer>,
  ): Promise<LeapApiResponse<LeapCustomer>> {
    try {
      logger.info("Updating customer in LEAP CRM", { customerId, customerData });

      const response: AxiosResponse = await this.apiClient.put(
        `/customers/${customerId}`,
        customerData,
      );

      logger.info("Customer updated successfully in LEAP CRM", {
        customerId: response.data.data?.id || customerId,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Customer updated successfully",
      };
    } catch (error: any) {
      logger.error("Failed to update customer in LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Update an existing job in LEAP CRM
   */
  async updateJob(
    jobId: string | number,
    jobData: Partial<LeapJob>,
  ): Promise<LeapApiResponse<LeapJob>> {
    try {
      logger.info("Updating job in LEAP CRM", { jobId, jobData });

      const response: AxiosResponse = await this.apiClient.put(
        `/jobs/${jobId}`,
        jobData,
      );

      logger.info("Job updated successfully in LEAP CRM", {
        jobId: response.data.data?.id || jobId,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Job updated successfully",
      };
    } catch (error: any) {
      logger.error("Failed to update job in LEAP CRM", {
        jobId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestData: jobData,
        timestamp: new Date().toISOString()
      });
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create a new job in LEAP CRM
   */
  async createJob(
    jobData: Partial<LeapJob>,
  ): Promise<LeapApiResponse<LeapJob>> {
    try {
      logger.info("Creating job in LEAP CRM", { jobData });

      const response: AxiosResponse = await this.apiClient.post(
        "/jobs",
        jobData,
      );

      logger.info("Job created successfully in LEAP CRM", {
        jobId: response.data.data?.id,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Job created successfully",
      };
    } catch (error: any) {
      logger.error("Failed to create job in LEAP CRM", {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestData: jobData,
        timestamp: new Date().toISOString()
      });
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create a new appointment in LEAP CRM
   * NOTE: LEAP API does not support creating appointments - they must be created manually in LEAP
   * This method returns appointment request information for manual processing
   */
  async createAppointment(
    appointmentData: Partial<LeapAppointment>,
  ): Promise<LeapApiResponse<any>> {
    logger.info("Appointment creation requested - LEAP API does not support creating appointments", { appointmentData });
    
    // Since LEAP doesn't support creating appointments via API,
    // we return the appointment request data for manual processing
    return {
      success: true,
      data: {
        message: "LEAP API does not support creating appointments. Appointment request logged for manual processing.",
        appointmentRequest: appointmentData,
        note: "This appointment must be manually created in the LEAP CRM system by staff."
      },
      status: 200,
      message: "Appointment request received - requires manual creation in LEAP CRM",
    };
  }

  /**
   * Get appointments from LEAP CRM or local system
   * Attempts LEAP first, falls back to local appointment system
   */
  async getAppointments(
    startDate?: string,
    endDate?: string,
    userId?: string,
  ): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Getting appointments", {
        startDate,
        endDate,
        userId,
      });

      try {
        // Try LEAP first
        const params: any = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (userId) params.user_id = userId;

        const response: AxiosResponse = await this.apiClient.get(
          '/appointments',
          { params },
        );

        logger.info(
          "Appointments retrieved successfully from LEAP CRM",
          {
            dataCount: Array.isArray(response.data.data)
              ? response.data.data.length
              : "N/A",
          },
        );

        return {
          success: true,
          data: response.data.data || response.data,
          status: response.status,
          message: "Appointments retrieved successfully from LEAP CRM",
        };
      } catch (leapError) {
        logger.warn("LEAP CRM appointments failed, falling back to local system", { 
          error: leapError 
        });
        
        // Fall back to local appointment system
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
        
        const filters: any = {};
        if (userId) filters.staffMemberId = userId;
        
        const localAppointments = await appointmentService.getAppointments(start, end, filters);
        
        // Map local appointments to LEAP-like format
        const mappedAppointments = localAppointments.map(apt => ({
          id: apt._id,
          start_date_time: apt.date.toISOString(),
          date: apt.date.toISOString().split('T')[0],
          start_time: apt.timeSlot,
          time: apt.timeSlot,
          title: `${apt.customerName} - ${apt.servicesOfInterest.join(', ')}`,
          job_name: `${apt.customerName} - ${apt.servicesOfInterest.join(', ')}`,
          description: apt.notes || '',
          notes: apt.notes || '',
          status: apt.status,
          staff_id: apt.staffMemberId,
          user_id: apt.staffMemberId,
          customer_name: apt.customerName,
          customer_email: apt.customerEmail,
          customer_phone: apt.customerPhone
        }));
        
        return {
          success: true,
          data: mappedAppointments,
          status: 200,
          message: "Appointments retrieved successfully from local system",
        };
      }
    } catch (error: any) {
      logger.error("Failed to get appointments", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      throw new Error(
        `Failed to get appointments: ${error.message}`,
      );
    }
  }

  /**
   * Check appointment availability for specific time slots (allows 2 appointments per slot)
   * Now uses local MongoDB appointment system instead of LEAP
   */
  async checkAppointmentAvailability(
    date: string,
    timeSlots: string[] = ['10:00 AM', '2:00 PM', '5:00 PM'],
    userId?: string,
  ): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Checking appointment availability", {
        date,
        timeSlots,
        userId,
      });

      // Parse date properly to avoid timezone issues by using UTC
      const [year, month, day] = date.split('-').map(Number);
      const checkDate = new Date(Date.UTC(year, month - 1, day)); // Use UTC to avoid timezone issues

      // For day of week calculation, use local date at noon to avoid edge cases
      const localCheckDate = new Date(year, month - 1, day, 12, 0, 0);
      const dayOfWeek = localCheckDate.getDay();

      logger.debug(`Checking date ${date}: year=${year}, month=${month}, day=${day}, UTC day of week=${checkDate.getDay()}, local day of week=${dayOfWeek}`);

      // Note: We allow Sunday appointments but don't suggest them in findNextAvailableMonday
      // Skip Sundays for business hours
      if (dayOfWeek === 0) {
        return {
          success: true,
          data: timeSlots.map(timeSlot => ({
            timeSlot,
            available: false,
            totalSlots: 2,
            availableSlots: 0,
            conflictingAppointments: [],
            reason: 'Closed on Sundays'
          })),
          status: 200,
          message: "Availability checked successfully (Closed on Sundays)",
        };
      }

      // Use local appointment service to check availability
      const availabilityData = await appointmentService.getAvailabilityForDate(checkDate);
      
      // Map to expected format
      const availability = timeSlots.map(timeSlot => {
        const slotData = availabilityData.availability.find((slot: any) => slot.timeSlot === timeSlot);
        
        if (!slotData) {
          return {
            time: timeSlot,
            available: true,
            totalSlots: 2,
            availableSlots: 2,
            conflictingAppointments: []
          };
        }
        
        return {
          time: timeSlot,
          available: slotData.available,
          totalSlots: slotData.totalSlots,
          availableSlots: slotData.availableSlots,
          conflictingAppointments: slotData.appointments || []
        };
      });

      return {
        success: true,
        data: {
          date,
          timeSlots: availability,
          totalAvailable: availability.filter(slot => slot.available).length
        },
        status: 200,
        message: 'Availability checked successfully'
      };
    } catch (error: any) {
      logger.error("Failed to check appointment availability", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message
        } (Status: ${error.response?.status || "unknown"
        }, Details: ${JSON.stringify(error.response?.data) || "none"})`,
      );
    }
  }

  /**
   * Find the next available Monday appointment slot
   */
  async findNextAvailableMonday(
    timeSlots: string[] = ['10:00 AM', '2:00 PM', '5:00 PM'],
    userId?: string,
  ): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Finding next available Monday appointment", {
        timeSlots,
        userId,
      });

      // Get next Monday
      const today = new Date();
      const nextMonday = new Date(today);

      // Monday is day 1, so calculate days until next Monday
      // If today is Sunday (0), we want next Monday (1 day from now)
      // If today is Monday (1), we want next Monday (7 days from now)
      // If today is Tuesday (2), we want next Monday (6 days from now)
      // If today is Wednesday (3), we want next Monday (5 days from now)
      // If today is Thursday (4), we want next Monday (4 days from now)
      // If today is Friday (5), we want next Monday (3 days from now)
      // If today is Saturday (6), we want next Monday (2 days from now)
      const currentDay = today.getDay();
      let daysUntilMonday;

      logger.debug(`DEBUG: Current date: ${today.toISOString()}, day of week: ${currentDay}`);

      if (currentDay === 0) { // Sunday
        daysUntilMonday = 1;
      } else if (currentDay === 1) { // Monday
        daysUntilMonday = 7; // Next Monday
      } else { // Tuesday through Saturday
        daysUntilMonday = 8 - currentDay;
      }

      logger.debug(`DEBUG: Days until Monday: ${daysUntilMonday}`);
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      logger.debug(`DEBUG: Calculated next Monday: ${nextMonday.toISOString()}, day of week: ${nextMonday.getDay()}`);

      // Ensure we calculated a Monday
      logger.info(`Today is ${today.toDateString()} (day ${currentDay}), next Monday is ${nextMonday.toDateString()} (day ${nextMonday.getDay()})`);

      if (nextMonday.getDay() !== 1) {
        logger.error(`Calculated next Monday is not a Monday! Day: ${nextMonday.getDay()}`);
        throw new Error('Failed to calculate next Monday correctly');
      }

      // Search for available slots starting from next Monday
      const maxWeeksToSearch = 4; // Search up to 4 weeks ahead

      for (let week = 0; week < maxWeeksToSearch; week++) {
        const searchDate = new Date(nextMonday);
        searchDate.setDate(nextMonday.getDate() + (week * 7));
        const dateString = searchDate.toISOString().split('T')[0];

        // Verify this is actually a Monday (should be, but let's be safe)
        if (searchDate.getDay() !== 1) {
          logger.warn(`Skipping non-Monday date ${dateString} (day ${searchDate.getDay()})`);
          continue;
        }
        
        // Extra safety check - never suggest Sundays
        if (searchDate.getDay() === 0) {
          logger.warn(`CRITICAL: Attempted to suggest Sunday ${dateString} - skipping!`);
          continue;
        }

        const availability = await this.checkAppointmentAvailability(
          dateString,
          timeSlots,
          userId
        );

        if (availability.success) {
          const availableSlots = availability.data.timeSlots.filter((slot: any) => slot.available);

          if (availableSlots.length > 0) {
            return {
              success: true,
              data: {
                date: dateString,
                nextAvailableSlot: availableSlots[0],
                allAvailableSlots: availableSlots,
                weeksFromNow: week,
                dayOfWeek: 'Monday'
              },
              status: 200,
              message: 'Next available Monday found'
            };
          }
        }
      }

      // No availability found in the search period
      return {
        success: false,
        data: {
          message: 'No available appointments found in the next 4 weeks'
        },
        status: 200,
        message: 'No availability found'
      };
    } catch (error: any) {
      logger.error("Failed to find next available Monday", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message
        } (Status: ${error.response?.status || "unknown"
        }, Details: ${JSON.stringify(error.response?.data) || "none"})`,
      );
    }
  }

  /**
   * Test connection to LEAP CRM
   */
  async testConnection(): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Testing LEAP CRM connection");

      // Try a simple GET request to test connectivity
      const response: AxiosResponse = await this.apiClient.get(
        "/customers?per_page=1",
      );

      logger.info("LEAP CRM connection test successful");

      return {
        success: true,
        data: { connectionStatus: "connected" },
        status: response.status,
        message: "LEAP CRM connection successful",
      };
    } catch (error: any) {
      logger.error("LEAP CRM connection test failed", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      });

      const errorMessage = `LEAP CRM Connection Error: ${error.response?.data?.message || error.message}`;
      const statusCode = error.response?.status;
      const errorDetails = error.response?.data;

      throw new Error(
        `${errorMessage} (Status: ${statusCode || "unknown"}, Details: ${JSON.stringify(errorDetails) || "none"})`,
      );
    }
  }

  /**
   * Update job description with new temperature rating (optimized for temp-only changes)
   */
  async updateJobTemperature(leadData: {
    leapJobId: string;
    leapCustomerId: string;
    tempRating: number;
    notes?: string;
    eventName?: string;
    referredBy?: string;
    appointmentDetails?: {
      preferredDate: string;
      preferredTime: string;
      notes?: string;
    };
    leadId: string;
    tradeIds?: number[];
    workTypeIds?: number[];
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    servicesOfInterest?: string[];
  }): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Updating job temperature in LEAP CRM", {
        jobId: leadData.leapJobId,
        customerId: leadData.leapCustomerId,
        tempRating: leadData.tempRating,
        leadId: leadData.leadId
      });

      // Build updated job description with new temperature
      const buildJobDescription = (data: any): string => {
        let description = data.notes || `Lead from ${data.eventName}`;
        
        // Append appointment details if provided
        if (data.appointmentDetails && (data.appointmentDetails.preferredDate || data.appointmentDetails.preferredTime || data.appointmentDetails.notes)) {
          description += "\n\n--- APPOINTMENT REQUEST ---";
          
          if (data.appointmentDetails.preferredDate) {
            const formattedDate = new Date(data.appointmentDetails.preferredDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric'
            });
            description += `\nPreferred Date: ${formattedDate}`;
          }
          
          if (data.appointmentDetails.preferredTime) {
            description += `\nPreferred Time: ${data.appointmentDetails.preferredTime}`;
          }
          
          // Always include appointment notes if they exist
          if (data.appointmentDetails.notes && data.appointmentDetails.notes.trim()) {
            description += `\nAppointment Notes: ${data.appointmentDetails.notes.trim()}`;
          }
        }
        // Handle case where only appointment notes exist (no date/time preferences)
        else if (data.appointmentDetails && data.appointmentDetails.notes && data.appointmentDetails.notes.trim()) {
          description += `\n\n--- APPOINTMENT NOTES ---`;
          description += `\n${data.appointmentDetails.notes.trim()}`;
        }
        
        // Append temp rating if provided
        if (data.tempRating && data.tempRating >= 1 && data.tempRating <= 10) {
          description += `\n\nTemp: ${data.tempRating}/10`;
        }
        
        return description;
      };

      // Update job with new description
      const jobUpdateData = {
        description: buildJobDescription(leadData),
        customer_id: leadData.leapCustomerId, // Required field
        trades: (leadData.tradeIds && leadData.tradeIds.length > 0) ? leadData.tradeIds : [105], // Required field - default to BATH REMODEL
        same_as_customer_address: 1, // Required field
        address: {
          address_line_1: leadData.address.street,
          city: leadData.address.city,
          state: leadData.address.state,
          zip: leadData.address.zipCode,
          country: "United States"
        },
        referral_source: leadData.referredBy || leadData.eventName,
        // Additional fields that might be helpful
        work_types: (leadData.workTypeIds && leadData.workTypeIds.length > 0) ? leadData.workTypeIds : [91139], // Default to Full Remodel
        other_trade_type_description: leadData.servicesOfInterest?.join(", ") || "",
        appointment_required: leadData.appointmentDetails ? 1 : 0
      };

      const jobResult = await this.updateJob(leadData.leapJobId, jobUpdateData);

      // Return result in format compatible with existing code
      const result = {
        success: true,
        data: {
          job: jobResult.data,
          id: jobResult.data.id || leadData.leapJobId,
          customer_id: leadData.leapCustomerId,
          job_id: jobResult.data.id || leadData.leapJobId,
          job_ids: [jobResult.data.id || leadData.leapJobId],
          tempUpdated: true // Flag to indicate this was a temperature-only update
        },
        status: 200,
        message: "Job temperature updated successfully"
      };

      logger.info("Job temperature updated successfully in LEAP CRM", {
        jobId: jobResult.data.id || leadData.leapJobId,
        customerId: leadData.leapCustomerId,
        tempRating: leadData.tempRating,
        leadId: leadData.leadId
      });

      return result;
    } catch (error: any) {
      logger.error("Failed to update job temperature in LEAP CRM", {
        jobId: leadData.leapJobId,
        customerId: leadData.leapCustomerId,
        tempRating: leadData.tempRating,
        leadId: leadData.leadId,
        error: error.message,
        stack: error.stack
      });
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Get company trades from LEAP CRM
   */
  async getCompanyTrades(): Promise<LeapApiResponse<any[]>> {
    try {
      logger.info("Getting company trades from LEAP CRM");

      const response: AxiosResponse = await this.apiClient.get(
        "/company/trades",
        {
          params: {
            'includes[]': 'work_types' // Include work types in the response
          }
        }
      );

      logger.info("Company trades retrieved successfully from LEAP CRM", {
        tradesCount: response.data.data?.length || 0,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Company trades retrieved successfully",
      };
    } catch (error: any) {
      logger.error("Failed to get company trades from LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get divisions from LEAP CRM
   */
  async getDivisions(): Promise<LeapApiResponse<any[]>> {
    try {
      logger.info("Getting divisions from LEAP CRM");

      const response: AxiosResponse = await this.apiClient.get(
        "/divisions",
      );

      logger.info("Divisions retrieved successfully from LEAP CRM", {
        divisionsCount: response.data.data?.length || 0,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Divisions retrieved successfully",
      };
    } catch (error: any) {
      logger.error("Failed to get divisions from LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get sales reps/users from LEAP CRM
   */
  async getSalesReps(): Promise<LeapApiResponse<any[]>> {
    try {
      logger.info("Getting sales reps from LEAP CRM");

      const response: AxiosResponse = await this.apiClient.get(
        "/company/users",
        {
          params: {
            active: 1, // Only get active users
            'includes[]': 'profile', // Include profile information
            sort_by: 'first_name',
            sort_order: 'asc'
          }
        }
      );

      logger.info("Sales reps retrieved successfully from LEAP CRM", {
        repsCount: response.data.data?.length || 0,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Sales reps retrieved successfully",
      };
    } catch (error: any) {
      logger.error("Failed to get sales reps from LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get valid referral types from LEAP CRM
   */
  async getReferralTypes(): Promise<LeapApiResponse<any[]>> {
    try {
      logger.info("Getting referral types from LEAP CRM");

      // Try different possible endpoints for referral information
      const possibleEndpoints = [
        "/referral_types",
        "/referral-types",
        "/referrals",
        "/referral_sources",
        "/referral-sources",
        "/sources",
        "/lead_sources",
        "/lead-sources",
        "/marketing_sources",
        "/marketing-sources"
      ];

      let response: AxiosResponse;
      let lastError: any;

      for (const endpoint of possibleEndpoints) {
        try {
          response = await this.apiClient.get(endpoint);
          logger.info(`Found referral data at endpoint: ${endpoint}`);
          break;
        } catch (error: any) {
          lastError = error;
          logger.debug(`Endpoint ${endpoint} failed:`, error.response?.status);
        }
      }

      if (!response!) {
        throw lastError;
      }

      logger.info("Referral types retrieved successfully from LEAP CRM", {
        typesCount: response.data.data?.length || 0,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Referral types retrieved successfully",
      };
    } catch (error: any) {
      logger.error("Failed to get referral types from LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create a prospect in LEAP CRM using the single Create Prospect API call
   */
  async createProspect(prospectData: {
    first_name: string;
    last_name: string;
    email: string;
    phones: { number: string; label: string }[];
    company_name?: string;
    rep_id?: number;
    referred_by_type?: string;
    referred_by_id?: number;
    referred_by_note?: string;
    temp_id?: number;
    is_commercial?: number;
    call_required?: number;
    customer_contacts?: { first_name: string; last_name: string }[];
    job: {
      name: string;
      day?: number;
      hour?: number;
      min?: number;
      same_as_customer_address?: number;
      same_as_customer_rep?: number;
      city?: string;
      address?: string;
      state_id?: number;
      country_id?: number;
      address_line_1?: string;
      lat?: string;
      long?: string;
      alt_id?: number;
      estimator_ids?: number[];
      description?: string;
      trades?: number[];
      other_trade_type_description?: string;
      call_required?: number;
      appointment_required?: number;
      insurance?: number;
      duration?: string;
    };
    address: {
      place_id?: string;
      company_name?: string;
      address: string;
      country?: string;
      zip: string;
      country_id?: number;
      state_id?: number;
      lat?: string;
      long?: string;
      same_as_customer_address?: number;
    };
    billing?: {
      place_id?: string;
      company_name?: string;
      address?: string;
      country?: string;
      zip?: string;
      country_id?: number;
      state_id?: number;
      lat?: string;
      long?: string;
      same_as_customer_address?: number;
    };
  }): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Creating prospect in LEAP CRM", { prospectData });

      // Use form-data format as required by the API
      const formData = new URLSearchParams();
      
      // Add basic prospect info
      formData.append('first_name', prospectData.first_name);
      formData.append('last_name', prospectData.last_name);
      formData.append('email', prospectData.email);
      
      // Add phone numbers
      prospectData.phones.forEach((phone, index) => {
        formData.append(`phones[${index}][number]`, phone.number);
        formData.append(`phones[${index}][label]`, phone.label);
      });
      
      // Add optional fields
      if (prospectData.company_name) {
        formData.append('company_name', prospectData.company_name);
      }
      if (prospectData.rep_id) {
        formData.append('rep_id', prospectData.rep_id.toString());
      }
      if (prospectData.referred_by_type) {
        formData.append('referred_by_type', prospectData.referred_by_type);
        // Try alternative field names for LEAP CRM compatibility
        formData.append('referral_type', prospectData.referred_by_type);
        formData.append('referral_source', prospectData.referred_by_type);
      }
      if (prospectData.referred_by_id) {
        formData.append('referred_by_id', prospectData.referred_by_id.toString());
        formData.append('referral_id', prospectData.referred_by_id.toString());
      }
      if (prospectData.referred_by_note) {
        formData.append('referred_by_note', prospectData.referred_by_note);
        // Try alternative field names for LEAP CRM compatibility
        formData.append('referral_note', prospectData.referred_by_note);
        formData.append('referral_notes', prospectData.referred_by_note);
        formData.append('source_notes', prospectData.referred_by_note);
      }
      if (prospectData.temp_id) {
        formData.append('temp_id', prospectData.temp_id.toString());
      }
      if (prospectData.is_commercial !== undefined) {
        formData.append('is_commercial', prospectData.is_commercial.toString());
      }
      if (prospectData.call_required !== undefined) {
        formData.append('call_required', prospectData.call_required.toString());
      }
      
      // Add customer contacts
      if (prospectData.customer_contacts) {
        prospectData.customer_contacts.forEach((contact, index) => {
          formData.append(`customer_contacts[${index}][first_name]`, contact.first_name);
          formData.append(`customer_contacts[${index}][last_name]`, contact.last_name);
        });
      }
      
      // Add job data
      const job = prospectData.job;
      formData.append('job[name]', job.name);
      if (job.day !== undefined) formData.append('job[day]', job.day.toString());
      if (job.hour !== undefined) formData.append('job[hour]', job.hour.toString());
      if (job.min !== undefined) formData.append('job[min]', job.min.toString());
      if (job.same_as_customer_address !== undefined) {
        formData.append('job[same_as_customer_address]', job.same_as_customer_address.toString());
      }
      if (job.same_as_customer_rep !== undefined) {
        formData.append('job[same_as_customer_rep]', job.same_as_customer_rep.toString());
      }
      if (job.city) formData.append('job[city]', job.city);
      if (job.address) formData.append('job[address]', job.address);
      if (job.state_id) formData.append('job[state_id]', job.state_id.toString());
      if (job.country_id) formData.append('job[country_id]', job.country_id.toString());
      if (job.address_line_1) formData.append('job[address_line_1]', job.address_line_1);
      if (job.lat) formData.append('job[lat]', job.lat);
      if (job.long) formData.append('job[long]', job.long);
      if (job.alt_id) formData.append('job[alt_id]', job.alt_id.toString());
      if (job.estimator_ids) {
        job.estimator_ids.forEach(id => {
          formData.append('job[estimator_ids][]', id.toString());
        });
      }
      if (job.description) formData.append('job[description]', job.description);
      if (job.trades) {
        job.trades.forEach(trade => {
          formData.append('job[trades][]', trade.toString());
        });
      }
      if (job.other_trade_type_description) {
        formData.append('job[other_trade_type_description]', job.other_trade_type_description);
      }
      // Add work type IDs if provided
      if ((job as any).work_types) {
        (job as any).work_types.forEach((workTypeId: number) => {
          formData.append('job[work_types][]', workTypeId.toString());
        });
      }
      if (job.call_required !== undefined) {
        formData.append('job[call_required]', job.call_required.toString());
      }
      if (job.appointment_required !== undefined) {
        formData.append('job[appointment_required]', job.appointment_required.toString());
      }
      if (job.insurance !== undefined) {
        formData.append('job[insurance]', job.insurance.toString());
      }
      if (job.duration) formData.append('job[duration]', job.duration);
      
      // Add address data
      const address = prospectData.address;
      if (address.place_id) formData.append('address[place_id]', address.place_id);
      if (address.company_name) formData.append('address[company_name]', address.company_name);
      formData.append('address[address]', address.address);
      if ((address as any).city) formData.append('address[city]', (address as any).city); // Add explicit city field
      if (address.country) formData.append('address[country]', address.country);
      formData.append('address[zip]', address.zip);
      if (address.country_id) formData.append('address[country_id]', address.country_id.toString());
      if (address.state_id) formData.append('address[state_id]', address.state_id.toString());
      if (address.lat) formData.append('address[lat]', address.lat);
      if (address.long) formData.append('address[long]', address.long);
      if (address.same_as_customer_address !== undefined) {
        formData.append('address[same_as_customer_address]', address.same_as_customer_address.toString());
      }
      
      // Add billing data if provided
      if (prospectData.billing) {
        const billing = prospectData.billing;
        if (billing.place_id) formData.append('billing[place_id]', billing.place_id);
        if (billing.company_name) formData.append('billing[company_name]', billing.company_name);
        if (billing.address) formData.append('billing[address]', billing.address);
        if ((billing as any).city) formData.append('billing[city]', (billing as any).city); // Add explicit city field
        if (billing.country) formData.append('billing[country]', billing.country);
        if (billing.zip) formData.append('billing[zip]', billing.zip);
        if (billing.country_id) formData.append('billing[country_id]', billing.country_id.toString());
        if (billing.state_id) formData.append('billing[state_id]', billing.state_id.toString());
        if (billing.lat) formData.append('billing[lat]', billing.lat);
        if (billing.long) formData.append('billing[long]', billing.long);
        if (billing.same_as_customer_address !== undefined) {
          formData.append('billing[same_as_customer_address]', billing.same_as_customer_address.toString());
        }
      }

      // Log the actual form data being sent to debug referral fields
      const formDataEntries = Array.from(formData.entries());
      const referralEntries = formDataEntries.filter(([key]) => key.includes('referred'));
      logger.info("LEAP Referral Form Data Being Sent:", {
        referralEntries,
        allFormDataKeys: formDataEntries.map(([key]) => key),
        timestamp: new Date().toISOString()
      });

      const response: AxiosResponse = await this.apiClient.post(
        "/prospects",
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': this.apiToken // this.apiToken already contains "Bearer "
          }
        }
      );

      logger.info("Prospect created successfully in LEAP CRM", {
        prospectId: response.data.data?.id,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Prospect created successfully",
      };
    } catch (error: any) {
      logger.error("Failed to create prospect in LEAP CRM", error);
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Update job name with LEAP's auto-generated job number
   */
  async updateJobName(jobId: string | number, jobNumber: string): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Updating job name in LEAP CRM", { jobId, jobNumber });

      const response: AxiosResponse = await this.apiClient.put(
        `/jobs/${jobId}`,
        { name: jobNumber },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.apiToken
          }
        }
      );

      logger.info("Job name updated successfully in LEAP CRM", {
        jobId,
        newName: jobNumber,
      });

      return {
        success: true,
        data: response.data.data || response.data,
        status: response.status,
        message: "Job name updated successfully",
      };
    } catch (error: any) {
      logger.error("Failed to update job name in LEAP CRM", {
        jobId,
        jobNumber,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(
        `LEAP CRM Error: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Sync a lead to LEAP CRM using the single Create Prospect API call
   */
  async syncLead(leadData: {
    fullName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    servicesOfInterest: string[];
    tradeIds?: number[]; // LEAP CRM trade IDs
    workTypeIds?: number[]; // LEAP CRM work type IDs (specific services within trades)
    salesRepId?: number; // LEAP CRM sales rep ID
        callCenterRepId?: number; // LEAP CRM call center rep ID
        divisionId?: number; // LEAP CRM division ID
        tempRating?: number; // Prospect temperature rating 1-10
    notes: string;
    eventName: string;
    referredBy?: string; // Source/referrer (usually the event name)
    referred_by_type?: string; // LEAP CRM referral type (e.g., 'Event')
    referred_by_id?: number; // LEAP CRM referral ID (e.g., 8 for Event)
    referred_by_note?: string; // LEAP CRM referral note (actual event name)
    appointmentDetails?: {
      preferredDate: string;
      preferredTime: string;
      notes?: string;
    };
    leadId?: string; // MongoDB ObjectID for tracking
    leapCustomerId?: string; // LEAP CRM customer ID for updates
    leapJobId?: string; // LEAP CRM job ID for updates
  }): Promise<LeapApiResponse<any>> {
    try {
      logger.info("Starting lead sync to LEAP CRM using Create Prospect API", { leadData });

      // Parse full name - ensure both first and last names are provided
      const nameParts = leadData.fullName.trim().split(" ");
      const firstName = nameParts[0] || "Unknown";
      const lastName = nameParts.slice(1).join(" ") || "Customer"; // Ensure last name is never empty

      // Map state to state_id (you'll need to maintain this mapping)
      const getStateId = (state: string): number => {
        const stateMap: { [key: string]: number } = {
          'AL': 1, 'AK': 2, 'AZ': 3, 'AR': 4, 'CA': 5, 'CO': 6, 'CT': 7, 'DE': 8, 'FL': 9, 'GA': 10,
          'HI': 11, 'ID': 12, 'IL': 13, 'IN': 14, 'IA': 15, 'KS': 16, 'KY': 17, 'LA': 18, 'ME': 19, 'MD': 20,
          'MA': 21, 'MI': 22, 'MN': 23, 'MS': 24, 'MO': 25, 'MT': 26, 'NE': 27, 'NV': 28, 'NH': 29, 'NJ': 30,
          'NM': 31, 'NY': 32, 'NC': 33, 'ND': 34, 'OH': 35, 'OK': 36, 'OR': 37, 'PA': 38, 'RI': 39, 'SC': 40,
          'SD': 41, 'TN': 42, 'TX': 43, 'UT': 44, 'VT': 45, 'VA': 46, 'WA': 47, 'WV': 48, 'WI': 49, 'WY': 50
        };
        return stateMap[state.toUpperCase()] || 13; // Default to IL (13)
      };

      // Build job description with appointment details, notes, and temp rating
      const buildJobDescription = (data: any): string => {
        let description = data.notes || `Lead from ${data.eventName}`;
        
        // Append appointment details if provided
        if (data.appointmentDetails && (data.appointmentDetails.preferredDate || data.appointmentDetails.preferredTime || data.appointmentDetails.notes)) {
          description += "\n\n--- APPOINTMENT REQUEST ---";
          
          if (data.appointmentDetails.preferredDate) {
            const formattedDate = new Date(data.appointmentDetails.preferredDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric'
            });
            description += `\nPreferred Date: ${formattedDate}`;
          }
          
          if (data.appointmentDetails.preferredTime) {
            description += `\nPreferred Time: ${data.appointmentDetails.preferredTime}`;
          }
          
          // Always include appointment notes if they exist, even without date/time
          if (data.appointmentDetails.notes && data.appointmentDetails.notes.trim()) {
            description += `\nAppointment Notes: ${data.appointmentDetails.notes.trim()}`;
          }
        }
        // Handle case where only appointment notes exist (no date/time preferences)
        else if (data.appointmentDetails && data.appointmentDetails.notes && data.appointmentDetails.notes.trim()) {
          description += `\n\n--- APPOINTMENT NOTES ---`;
          description += `\n${data.appointmentDetails.notes.trim()}`;
        }
        
        // Append temp rating if provided
        if (data.tempRating && data.tempRating >= 1 && data.tempRating <= 10) {
          description += `\n\nTemp: ${data.tempRating}/10`;
        }
        
        return description;
      };

      // Build prospect data using the new API format
      const prospectData = {
        first_name: firstName,
        last_name: lastName,
        email: leadData.email,
        phones: [
          {
            number: leadData.phone.replace(/\D/g, '').padStart(10, '0'), // Ensure minimum 10 digits
            label: "home"
          }
        ],
        company_name: leadData.referredBy || leadData.eventName, // Use actual event name for tracking
        rep_id: leadData.salesRepId || leadData.callCenterRepId || 88443, // Default to BDC Rep
        division_id: leadData.divisionId || 6496, // Default to Renovation division
        referred_by_type: "other", // Always use 'other' for events
        referred_by_note: leadData.referredBy || leadData.eventName, // Use actual event name
        temp_id: Math.floor(Math.random() * 1000), // Generate a temp ID
        is_commercial: 0, // Assume residential
        call_required: 0,
        customer_contacts: [
          {
            first_name: firstName,
            last_name: lastName
          }
        ],
        job: {
          name: `${lastName} - ${leadData.referredBy || leadData.eventName}`, // Temporary name, will be updated with job ID after creation
          day: 0,
          hour: 0,
          min: 0,
          same_as_customer_address: 1,
          same_as_customer_rep: 0,
          city: leadData.address.city,
          address: leadData.address.street,
          state_id: getStateId(leadData.address.state),
          country_id: 1, // US
          address_line_1: leadData.address.street,
          lat: "0", // You might want to geocode this
          long: "0", // You might want to geocode this
          alt_id: leadData.leadId ? parseInt(leadData.leadId.slice(-8), 16) : Math.floor(Math.random() * 100000), // Convert leadId to number or use random
          estimator_ids: leadData.salesRepId ? [leadData.salesRepId] : [],
          description: buildJobDescription(leadData),
          trades: (leadData.tradeIds && leadData.tradeIds.length > 0) ? leadData.tradeIds : [105], // Default to BATH REMODEL (105)
          work_types: (leadData.workTypeIds && leadData.workTypeIds.length > 0) ? leadData.workTypeIds : [91139], // Default to Full Remodel (91139)
          other_trade_type_description: leadData.servicesOfInterest.join(", "),
          call_required: 0,
          appointment_required: leadData.appointmentDetails ? 1 : 0,
          insurance: 0,
          duration: "0:0:0"
        },
        address: {
          place_id: "", // You might want to use Google Places API
          company_name: leadData.referredBy || leadData.eventName,
          address: leadData.address.street,
          city: leadData.address.city, // Add explicit city field
          country: "United States",
          zip: leadData.address.zipCode,
          country_id: 1,
          state_id: getStateId(leadData.address.state),
          lat: "0", // You might want to geocode this
          long: "0", // You might want to geocode this
          same_as_customer_address: 1
        },
        billing: {
          place_id: "",
          company_name: leadData.referredBy || leadData.eventName,
          address: leadData.address.street,
          city: leadData.address.city, // Add explicit city field
          country: "United States",
          zip: leadData.address.zipCode,
          country_id: 1,
          state_id: getStateId(leadData.address.state),
          lat: "0",
          long: "0",
          same_as_customer_address: 1
        }
      };

      // Check if this is an update to an existing customer/job
      if (leadData.leapJobId || leadData.leapCustomerId) {
        logger.info("Updating existing customer/job in LEAP CRM", {
          leapCustomerId: leadData.leapCustomerId,
          leapJobId: leadData.leapJobId,
          leadId: leadData.leadId
        });

        let customerExists = true;
        let jobExists = true;
        
        // Update existing customer if customer ID is available
        if (leadData.leapCustomerId) {
          try {
            const customerUpdateData = {
              first_name: firstName,
              last_name: lastName,
              email: leadData.email,
              phones: [
                {
                  number: leadData.phone.replace(/\D/g, '').padStart(10, '0'),
                  type: "home" as const,
                  label: "home",
                  primary: true
                }
              ],
              addresses: [
                {
                  address_line_1: leadData.address.street,
                  city: leadData.address.city,
                  state: leadData.address.state,
                  zip: leadData.address.zipCode,
                  country: "United States"
                }
              ],
              status: "active" as const,
              company_name: leadData.referredBy || leadData.eventName
            };
            
            await this.updateCustomer(leadData.leapCustomerId, customerUpdateData);
            logger.info("Customer updated successfully in LEAP CRM", {
              customerId: leadData.leapCustomerId
            });
          } catch (customerError: any) {
            // Check if customer was deleted (404) or doesn't exist
            const isNotFound = customerError.message.includes('404') || 
                              customerError.message.includes('not found') ||
                              customerError.message.includes('Customer not found') ||
                              (customerError.response && customerError.response.status === 404);
                              
            if (isNotFound) {
              logger.warn("Customer no longer exists in LEAP CRM - will recreate via prospect creation", {
                customerId: leadData.leapCustomerId,
                error: customerError.message
              });
              customerExists = false;
            } else if (customerError.response && customerError.response.status === 412) {
              // Don't recreate for validation errors (412) - these are issues with our request
              const validationErrors = customerError.response.data?.error?.validation || customerError.response.data?.validation || {};
              const errorDetails = Object.entries(validationErrors)
                .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                .join('; ');
              
              const enhancedError = new Error(
                `LEAP CRM Customer Update Validation Failed: ${errorDetails || 'Unknown validation error'}`
              );
              
              // Add the validation details to the error for the frontend
              (enhancedError as any).validationErrors = validationErrors;
              (enhancedError as any).statusCode = 412;
              
              logger.error("Customer update failed due to validation errors - not recreating prospect", {
                customerId: leadData.leapCustomerId,
                error: customerError.message,
                validationErrors,
                errorDetails
              });
              
              throw enhancedError; // Re-throw with enhanced validation details
            } else {
              logger.warn("Failed to update customer due to other error, but continuing with job update", {
                customerId: leadData.leapCustomerId,
                error: customerError.message,
                statusCode: customerError.response?.status
              });
            }
          }
        }

        // Update existing job if job ID is available
        if (leadData.leapJobId) {
          try {
            const jobUpdateData = {
              name: leadData.leadId || `${lastName} - ${leadData.referredBy || leadData.eventName}`,
              description: buildJobDescription(leadData),
              customer_id: leadData.leapCustomerId, // Required field
              trades: (leadData.tradeIds && leadData.tradeIds.length > 0) ? leadData.tradeIds : [105], // Required field - default to BATH REMODEL
              same_as_customer_address: 1, // Required field
              address: {
                address_line_1: leadData.address.street,
                city: leadData.address.city,
                state: leadData.address.state,
                zip: leadData.address.zipCode,
                country: "United States"
              },
              referral_source: leadData.referredBy || leadData.eventName,
              // Additional fields that might be helpful
              work_types: (leadData.workTypeIds && leadData.workTypeIds.length > 0) ? leadData.workTypeIds : [91139], // Default to Full Remodel
              other_trade_type_description: leadData.servicesOfInterest?.join(", ") || "",
              appointment_required: leadData.appointmentDetails ? 1 : 0
            };

            const jobResult = await this.updateJob(leadData.leapJobId, jobUpdateData);

            // Return result in format compatible with existing code
            const result = {
              success: true,
              data: {
                job: jobResult.data,
                id: jobResult.data.id || leadData.leapJobId,
                customer_id: leadData.leapCustomerId,
                job_id: jobResult.data.id || leadData.leapJobId,
                job_ids: [jobResult.data.id || leadData.leapJobId] // Match the format expected by job ID extraction
              },
              status: 200,
              message: "Customer and job updated successfully"
            };

            logger.info("Job updated successfully in LEAP CRM", {
              jobId: jobResult.data.id || leadData.leapJobId,
              customerId: leadData.leapCustomerId,
              leadId: leadData.leadId
            });

            return result;
          } catch (jobError: any) {
            // Check if job was deleted (404) or doesn't exist
            const isNotFound = jobError.message.includes('404') || 
                              jobError.message.includes('not found') ||
                              jobError.message.includes('Job not found') ||
                              (jobError.response && jobError.response.status === 404);
                              
            if (isNotFound) {
              logger.warn("Job no longer exists in LEAP CRM - will recreate via prospect creation", {
                jobId: leadData.leapJobId,
                error: jobError.message
              });
              jobExists = false;
            } else {
              // Don't recreate for validation errors (412) - these are issues with our request
              if (jobError.response && jobError.response.status === 412) {
                const validationErrors = jobError.response.data?.error?.validation || jobError.response.data?.validation || {};
                const errorDetails = Object.entries(validationErrors)
                  .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                  .join('; ');
                
                const enhancedError = new Error(
                  `LEAP CRM Job Update Validation Failed: ${errorDetails || 'Unknown validation error'}`
                );
                
                // Add the validation details to the error for the frontend
                (enhancedError as any).validationErrors = validationErrors;
                (enhancedError as any).statusCode = 412;
                
                logger.error("Job update failed due to validation errors - not recreating prospect", {
                  jobId: leadData.leapJobId,
                  error: jobError.message,
                  validationErrors,
                  errorDetails
                });
                
                throw enhancedError; // Re-throw with enhanced validation details
              } else {
                // For other non-404 errors, treat them as recoverable and continue
                // Don't recreate the prospect for general update failures
                logger.warn("Failed to update job due to other error, but not recreating prospect", {
                  jobId: leadData.leapJobId,
                  error: jobError.message,
                  statusCode: jobError.response?.status
                });
                // Don't set jobExists = false here - only for genuine 404 errors
              }
            }
          }
        }
        
        // If customer or job no longer exists, recreate via prospect API
        if (!customerExists || !jobExists) {
          logger.info("Recreating customer/job via prospect creation since entities were deleted", {
            customerExists,
            jobExists,
            leadId: leadData.leadId
          });
          
          // Clear the existing IDs since they're invalid
          delete leadData.leapCustomerId;
          delete leadData.leapJobId;
          
          // Recursively call syncLead to create new prospect
          return await this.syncLead(leadData);
        }
        
        // If we reach here, only customer exists and was updated successfully
        const result = {
          success: true,
          data: {
            id: leadData.leapCustomerId,
            customer_id: leadData.leapCustomerId,
          },
          status: 200,
          message: "Customer updated successfully"
        };
        
        logger.info("Customer updated successfully in LEAP CRM", {
          customerId: leadData.leapCustomerId,
          leadId: leadData.leadId
        });
        
        return result;
      } else {
        // Create new prospect (customer + job in one call)
        logger.info("Creating new prospect in LEAP CRM", {
          prospectData,
          timestamp: new Date().toISOString()
        });

        const result = await this.createProspect(prospectData);

        // Try to update the job name with the auto-generated job ID
        try {
        // Log the full LEAP response structure to understand the data format
        logger.info("LEAP API Response Structure for Job ID extraction:", {
          responseData: result.data,
          responseKeys: result.data ? Object.keys(result.data) : 'No data',
          timestamp: new Date().toISOString()
        });
        
        // Try multiple possible paths for job ID - LEAP returns job_ids as an array
        const jobId = result.data?.job_ids?.[0] ||  // LEAP returns job_ids as array - this is the correct path
                     result.data?.job?.id || 
                     result.data?.job_id || 
                     result.data?.data?.job?.id ||
                     result.data?.data?.job_id ||
                     result.data?.prospect?.job?.id ||
                     result.data?.prospect_id;
        
        logger.info("Extracted job ID from LEAP response:", {
          jobId,
          jobIdType: typeof jobId,
          prospectId: result.data?.id || result.data?.prospect_id,
          timestamp: new Date().toISOString()
        });
        
        if (jobId) {
          // Convert job ID to string for the job name
          const jobIdString = String(jobId);
          
          logger.info("Updating job name to match LEAP job ID", {
            jobId,
            newJobName: jobIdString,
            prospectId: result.data?.id || result.data?.prospect_id
          });
          
          // Update the job name to use the LEAP-assigned job ID
          await this.updateJobName(jobId, jobIdString);
          
          logger.info("Job name updated successfully to match job ID", {
            jobId,
            updatedJobName: jobIdString
          });
        } else {
          logger.warn("Job ID not found in LEAP response - skipping job name update", {
            prospectId: result.data?.id || result.data?.prospect_id,
            responseStructure: {
              hasJob: !!result.data?.job,
              hasJobId: !!result.data?.job_id,
              hasData: !!result.data?.data,
              hasProspect: !!result.data?.prospect,
              topLevelKeys: result.data ? Object.keys(result.data) : []
            }
          });
        }
      } catch (updateError: any) {
        logger.warn("Failed to update job name with job ID, but prospect was created successfully", {
          error: updateError.message,
          errorStack: updateError.stack,
          prospectId: result.data?.id || result.data?.prospect_id,
          timestamp: new Date().toISOString()
        });
        }

        logger.info("Lead sync to LEAP CRM completed successfully using Create Prospect API", {
          prospectId: result.data?.id,
          result
        });

        return result;
      }
    } catch (error: any) {
      logger.error("Failed to sync lead to LEAP CRM using Create Prospect API", error);
      throw error;
    }
  }
}

// Export factory function to avoid initialization issues
export const createLeapService = () => new LeapService();

// Lazy initialization
let leapServiceInstance: LeapService | null = null;
export const leapService = {
  get instance() {
    if (!leapServiceInstance) {
      leapServiceInstance = new LeapService();
    }
    return leapServiceInstance;
  },

  // Proxy methods
  async testConnection() {
    return this.instance.testConnection();
  },

  async syncLead(leadData: any) {
    return this.instance.syncLead(leadData);
  },

  async createProspect(prospectData: any) {
    return this.instance.createProspect(prospectData);
  },

  async createCustomer(customerData: any) {
    return this.instance.createCustomer(customerData);
  },

  async updateCustomer(customerId: string | number, customerData: any) {
    return this.instance.updateCustomer(customerId, customerData);
  },

  async createJob(jobData: any) {
    return this.instance.createJob(jobData);
  },

  async updateJob(jobId: string | number, jobData: any) {
    return this.instance.updateJob(jobId, jobData);
  },

  async createAppointment(appointmentData: any) {
    return this.instance.createAppointment(appointmentData);
  },

  async getAppointments(startDate?: string, endDate?: string, userId?: string) {
    return this.instance.getAppointments(startDate, endDate, userId);
  },

  async checkAppointmentAvailability(date: string, timeSlots?: string[], userId?: string) {
    return this.instance.checkAppointmentAvailability(date, timeSlots, userId);
  },

  async findNextAvailableMonday(timeSlots?: string[], userId?: string) {
    return this.instance.findNextAvailableMonday(timeSlots, userId);
  },

  async getCompanyTrades() {
    return this.instance.getCompanyTrades();
  },

  async getDivisions() {
    return this.instance.getDivisions();
  },

  async getSalesReps() {
    return this.instance.getSalesReps();
  },

  async getReferralTypes() {
    return this.instance.getReferralTypes();
  },

  async updateJobTemperature(leadData: any) {
    return this.instance.updateJobTemperature(leadData);
  },
};
