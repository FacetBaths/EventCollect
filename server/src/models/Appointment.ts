import mongoose, { Schema, Document } from "mongoose";

// Interface for the Appointment document
export interface IAppointment extends Document {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: Date; // The appointment date
  timeSlot: string; // e.g., "9:00 AM", "10:30 AM"
  duration?: number; // Duration in minutes, default 90
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  staffMemberId?: string; // ID of assigned staff member
  staffMemberName?: string; // Name of assigned staff member
  notes?: string; // Appointment notes
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  servicesOfInterest: string[]; // Services the customer is interested in
  tradeIds?: number[]; // LEAP CRM trade IDs
  salesRepId?: number; // LEAP CRM sales rep ID
  
  // Reference to related records
  leadId?: string; // Reference to Lead document
  leapProspectId?: string; // Reference to LEAP prospect
  eventName?: string; // Event where lead was captured
  
  // System fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User who created the appointment
  lastModifiedBy?: string; // User who last modified the appointment
}

// Appointment Schema
const appointmentSchema = new Schema<IAppointment>(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      enum: [
        "9:00 AM",
        "10:30 AM", 
        "12:00 PM",
        "1:30 PM",
        "3:00 PM",
        "4:30 PM"
      ],
    },
    duration: {
      type: Number,
      default: 90, // 90 minutes default
    },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    staffMemberId: {
      type: String,
      default: null,
    },
    staffMemberName: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipCode: {
        type: String,
        required: true,
      },
    },
    servicesOfInterest: [{
      type: String,
      trim: true,
    }],
    tradeIds: {
      type: [Number],
      default: [],
    },
    salesRepId: {
      type: Number,
      default: null,
    },
    
    // References
    leadId: {
      type: String,
      default: null,
    },
    leapProspectId: {
      type: String,
      default: null,
    },
    eventName: {
      type: String,
      default: null,
    },
    
    // System fields
    createdBy: {
      type: String,
      default: null,
    },
    lastModifiedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and constraints
appointmentSchema.index({ date: 1, timeSlot: 1 }); // For availability checking
appointmentSchema.index({ customerEmail: 1 });
appointmentSchema.index({ customerPhone: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ leadId: 1 });
appointmentSchema.index({ leapProspectId: 1 });
appointmentSchema.index({ staffMemberId: 1 });
appointmentSchema.index({ createdAt: -1 });

// Compound index to limit 2 appointments per time slot
appointmentSchema.index(
  { date: 1, timeSlot: 1 },
  { 
    name: "date_timeSlot_limit",
    partialFilterExpression: { 
      status: { $in: ["scheduled", "confirmed"] } 
    }
  }
);

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time
appointmentSchema.virtual('formattedDateTime').get(function() {
  const formattedDate = this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `${formattedDate} at ${this.timeSlot}`;
});

// Instance method to check if appointment is active
appointmentSchema.methods.isActive = function() {
  return this.status === 'scheduled' || this.status === 'confirmed';
};

// Static method to get availability for a date
appointmentSchema.statics.getAvailabilityForDate = async function(date: Date) {
  const timeSlots = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"];
  
  // Get start and end of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get all active appointments for the date
  const appointments = await this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['scheduled', 'confirmed'] }
  });
  
  // Build availability map
  const availability = timeSlots.map(timeSlot => {
    const appointmentsInSlot = appointments.filter((apt: any) => apt.timeSlot === timeSlot);
    return {
      timeSlot,
      available: appointmentsInSlot.length < 2, // Max 2 appointments per slot
      bookedCount: appointmentsInSlot.length,
      totalSlots: 2,
      availableSlots: 2 - appointmentsInSlot.length,
      appointments: appointmentsInSlot
    };
  });
  
  return availability;
};

// Static method to check if a specific time slot is available
appointmentSchema.statics.isTimeSlotAvailable = async function(date: Date, timeSlot: string) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const count = await this.countDocuments({
    date: { $gte: startOfDay, $lte: endOfDay },
    timeSlot,
    status: { $in: ['scheduled', 'confirmed'] }
  });
  
  return count < 2; // Max 2 appointments per slot
};

// Create and export the Appointment model
export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);

export default Appointment;
