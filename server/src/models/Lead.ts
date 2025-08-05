import mongoose, { Schema, Document } from "mongoose";

// Interface for the Lead document
export interface ILead extends Document {
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
  notes?: string;
  wantsAppointment: boolean;
  appointmentDetails?: {
    staffMemberId?: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  };
  eventId?: string;
  eventName?: string;
  referredBy?: string; // Source/referrer (usually the event name)
  referred_by_type?: string; // LEAP CRM referral type (e.g., 'Event')
  referred_by_id?: number; // LEAP CRM referral ID (e.g., 8 for Event)
  referred_by_note?: string; // LEAP CRM referral note (actual event name)
  leapProspectId?: string; // Single prospect ID from Create Prospect API
  leapCustomerId?: string; // Legacy - kept for backward compatibility
  leapJobId?: string; // Legacy - kept for backward compatibility
  leapAppointmentId?: string; // Legacy - kept for backward compatibility
  syncStatus: "pending" | "synced" | "error";
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lead Schema
const leadSchema = new Schema<ILead>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      street: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      zipCode: {
        type: String,
        default: "",
      },
    },
    servicesOfInterest: [
      {
        type: String,
        trim: true,
      },
    ],
    tradeIds: {
      type: [Number],
      default: [],
    },
    workTypeIds: {
      type: [Number],
      default: [],
    },
    salesRepId: {
      type: Number,
      default: null,
    },
    callCenterRepId: {
      type: Number,
      default: null,
    },
    divisionId: {
      type: Number,
      default: 6496, // Default to Renovation division
    },
    tempRating: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    wantsAppointment: {
      type: Boolean,
      default: false,
    },
    appointmentDetails: {
      staffMemberId: {
        type: String,
        default: null,
      },
      preferredDate: {
        type: String,
        default: "",
      },
      preferredTime: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
    },
    eventId: {
      type: String,
      default: null,
    },
    eventName: {
      type: String,
      default: null,
    },
    referredBy: {
      type: String,
      default: null,
    },
    referred_by_type: {
      type: String,
      default: null,
    },
    referred_by_id: {
      type: Number,
      default: null,
    },
    referred_by_note: {
      type: String,
      default: null,
    },
    leapProspectId: {
      type: String,
      default: null,
    },
    leapCustomerId: {
      type: String,
      default: null,
    },
    leapJobId: {
      type: String,
      default: null,
    },
    leapAppointmentId: {
      type: String,
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "synced", "error"],
      default: "pending",
    },
    syncError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ syncStatus: 1 });
leadSchema.index({ leapProspectId: 1 });
leadSchema.index({ leapCustomerId: 1 });
leadSchema.index({ createdAt: -1 });

// Create and export the Lead model
export const Lead = mongoose.model<ILead>("Lead", leadSchema);

export default Lead;
