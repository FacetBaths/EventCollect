// Temporary types until we set up the shared package properly

export interface LeadFormData {
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
  workTypeIds?: number[]; // LEAP CRM work type IDs
  salesRepId?: number | undefined; // LEAP CRM sales rep ID
  callCenterRepId?: number; // LEAP CRM call center rep ID
  divisionId?: number; // LEAP CRM division ID
  notes: string;
  wantsAppointment: boolean;
  appointmentDetails?: {
    staffMemberId?: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  };
  eventName?: string;
  referredBy?: string; // Source/referrer (usually the event name)
  referred_by_type?: string; // LEAP CRM referral type (e.g., 'Event')
  referred_by_id?: number; // LEAP CRM referral ID (e.g., 8 for Event)
  referred_by_note?: string; // LEAP CRM referral note (actual event name)
}

export interface LeapTrade {
  id: number;
  name: string;
  color?: string;
  work_types?: {
    data: LeapWorkType[];
  };
}

export interface LeapWorkType {
  id: number;
  name: string;
  trade_id: number;
  color: string;
}

export interface LeapDivision {
  id: number;
  name: string;
  // Add other division properties as needed
}

export interface LeapSalesRep {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  active: boolean;
  company?: string;
  profile?: {
    id: number;
    user_id: number;
    phone: string;
    position: string;
    additional_phone?: {
      label: string;
      phone: string;
      extension: string;
    }[];
  };
  group?: {
    id: number;
    name: string;
  };
}

export const DEFAULT_SERVICES = [
  "Vanity",
  "Tub Update",
  "Shower Update",
  "Walk-in Tub",
  "Tub/Shower Conversion",
  "Standalone Tub",
  "Toilet",
  "Flooring",
  "Exhaust/ Lights",
] as const;
