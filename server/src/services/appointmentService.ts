import { Appointment, IAppointment } from '../models/Appointment';
import { logger } from '../utils/logger';

export interface CreateAppointmentData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: Date;
  timeSlot: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  servicesOfInterest: string[];
  notes?: string;
  staffMemberId?: string;
  staffMemberName?: string;
  tradeIds?: number[];
  salesRepId?: number;
  leadId?: string;
  leapProspectId?: string;
  eventName?: string;
  createdBy?: string;
}

export interface UpdateAppointmentData {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  date?: Date;
  timeSlot?: string;
  status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  staffMemberId?: string;
  staffMemberName?: string;
  notes?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  servicesOfInterest?: string[];
  tradeIds?: number[];
  salesRepId?: number;
  lastModifiedBy?: string;
}

export interface AvailabilityQuery {
  startDate: Date;
  endDate: Date;
  timeSlots?: string[];
}

export class AppointmentService {
  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: CreateAppointmentData): Promise<IAppointment> {
    try {
      logger.info('Creating new appointment', { 
        customerEmail: appointmentData.customerEmail,
        date: appointmentData.date,
        timeSlot: appointmentData.timeSlot
      });

      // Check if the time slot is available
      const isAvailable = await (Appointment as any).isTimeSlotAvailable(appointmentData.date, appointmentData.timeSlot);
      
      if (!isAvailable) {
        throw new Error(`Time slot ${appointmentData.timeSlot} on ${appointmentData.date.toDateString()} is fully booked`);
      }

      // Create the appointment
      const appointment = new Appointment(appointmentData);
      const savedAppointment = await appointment.save();

      logger.info('Appointment created successfully', { 
        appointmentId: savedAppointment._id,
        customerEmail: appointmentData.customerEmail 
      });

      return savedAppointment;
    } catch (error: any) {
      logger.error('Failed to create appointment', { 
        error: error.message,
        appointmentData 
      });
      throw error;
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<IAppointment | null> {
    try {
      const appointment = await Appointment.findById(appointmentId);
      return appointment;
    } catch (error: any) {
      logger.error('Failed to get appointment by ID', { 
        appointmentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update an appointment
   */
  async updateAppointment(appointmentId: string, updateData: UpdateAppointmentData): Promise<IAppointment | null> {
    try {
      logger.info('Updating appointment', { appointmentId, updateData });

      // If changing date/time, check availability
      if (updateData.date || updateData.timeSlot) {
        const currentAppointment = await Appointment.findById(appointmentId);
        if (!currentAppointment) {
          throw new Error('Appointment not found');
        }

        const newDate = updateData.date || currentAppointment.date;
        const newTimeSlot = updateData.timeSlot || currentAppointment.timeSlot;

        // Only check availability if actually changing the slot
        if (newDate.getTime() !== currentAppointment.date.getTime() || newTimeSlot !== currentAppointment.timeSlot) {
          const isAvailable = await (Appointment as any).isTimeSlotAvailable(newDate, newTimeSlot);
          if (!isAvailable) {
            throw new Error(`Time slot ${newTimeSlot} on ${newDate.toDateString()} is fully booked`);
          }
        }
      }

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        updateData,
        { new: true, runValidators: true }
      );

      if (updatedAppointment) {
        logger.info('Appointment updated successfully', { appointmentId });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Failed to update appointment', { 
        appointmentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, cancelledBy?: string): Promise<IAppointment | null> {
    try {
      logger.info('Cancelling appointment', { appointmentId, cancelledBy });

      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          status: 'cancelled',
          lastModifiedBy: cancelledBy
        },
        { new: true }
      );

      if (updatedAppointment) {
        logger.info('Appointment cancelled successfully', { appointmentId });
      }

      return updatedAppointment;
    } catch (error: any) {
      logger.error('Failed to cancel appointment', { 
        appointmentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get appointments within a date range
   */
  async getAppointments(
    startDate: Date, 
    endDate: Date, 
    filters?: {
      status?: string | string[];
      staffMemberId?: string;
      customerEmail?: string;
    }
  ): Promise<IAppointment[]> {
    try {
      logger.info('Getting appointments', { startDate, endDate, filters });

      const query: any = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query.status = { $in: filters.status };
        } else {
          query.status = filters.status;
        }
      }

      if (filters?.staffMemberId) {
        query.staffMemberId = filters.staffMemberId;
      }

      if (filters?.customerEmail) {
        query.customerEmail = filters.customerEmail;
      }

      const appointments = await Appointment.find(query).sort({ date: 1, timeSlot: 1 });
      
      logger.info('Retrieved appointments', { count: appointments.length });
      return appointments;
    } catch (error: any) {
      logger.error('Failed to get appointments', { 
        startDate, 
        endDate, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check availability for multiple dates
   */
  async checkAvailability(query: AvailabilityQuery): Promise<any[]> {
    try {
      logger.info('Checking availability', query);

      const availabilityData = [];
      const currentDate = new Date(query.startDate);
      
      while (currentDate <= query.endDate) {
        // Skip Sundays (day 0)
        if (currentDate.getDay() !== 0) {
          const dayAvailability = await (Appointment as any).getAvailabilityForDate(currentDate);
          
          // Filter by requested time slots if provided
          const filteredAvailability = query.timeSlots 
            ? dayAvailability.filter((slot: any) => query.timeSlots!.includes(slot.timeSlot))
            : dayAvailability;

          availabilityData.push({
            date: new Date(currentDate),
            dateString: currentDate.toISOString().split('T')[0],
            dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            availability: filteredAvailability,
            totalAvailable: filteredAvailability.reduce((sum: number, slot: any) => sum + slot.availableSlots, 0),
            hasAvailability: filteredAvailability.some((slot: any) => slot.available)
          });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return availabilityData;
    } catch (error: any) {
      logger.error('Failed to check availability', { 
        query, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get availability for a specific date
   */
  async getAvailabilityForDate(date: Date): Promise<any> {
    try {
      logger.info('Getting availability for date', { date });

      const availability = await (Appointment as any).getAvailabilityForDate(date);
      
      return {
        date,
        dateString: date.toISOString().split('T')[0],
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        availability,
        totalAvailable: availability.reduce((sum: number, slot: any) => sum + slot.availableSlots, 0),
        hasAvailability: availability.some((slot: any) => slot.available)
      };
    } catch (error: any) {
      logger.error('Failed to get availability for date', { 
        date, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find next available appointment slot
   */
  async findNextAvailableSlot(startDate?: Date, timeSlots?: string[]): Promise<any | null> {
    try {
      const searchStartDate = startDate || new Date();
      const maxDaysAhead = 30; // Search up to 30 days ahead
      const endDate = new Date(searchStartDate);
      endDate.setDate(endDate.getDate() + maxDaysAhead);

      logger.info('Finding next available slot', { 
        startDate: searchStartDate, 
        endDate, 
        timeSlots 
      });

      const availabilityData = await this.checkAvailability({
        startDate: searchStartDate,
        endDate,
        timeSlots
      });

      // Find first date with availability
      for (const dayData of availabilityData) {
        if (dayData.hasAvailability) {
          // Find first available time slot
          const availableSlot = dayData.availability.find((slot: any) => slot.available);
          if (availableSlot) {
            return {
              date: dayData.date,
              dateString: dayData.dateString,
              dayOfWeek: dayData.dayOfWeek,
              timeSlot: availableSlot.timeSlot,
              availableSlots: availableSlot.availableSlots
            };
          }
        }
      }

      return null; // No availability found
    } catch (error: any) {
      logger.error('Failed to find next available slot', { 
        startDate, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(startDate: Date, endDate: Date): Promise<any> {
    try {
      logger.info('Getting appointment statistics', { startDate, endDate });

      const stats = await Appointment.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalAppointments = await Appointment.countDocuments({
        date: { $gte: startDate, $lte: endDate }
      });

      return {
        totalAppointments,
        statusBreakdown: stats,
        dateRange: { startDate, endDate }
      };
    } catch (error: any) {
      logger.error('Failed to get appointment statistics', { 
        startDate, 
        endDate, 
        error: error.message 
      });
      throw error;
    }
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();
