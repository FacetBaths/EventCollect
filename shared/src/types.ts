// Lead form data structure
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
  notes: string;
  wantsAppointment: boolean;
  appointmentDetails?: {
    staffMemberId?: string;
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  };
}

// Event management types
export interface Event {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Staff management types
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  availableSlots?: TimeSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  isActive?: boolean;
}

// Lead storage types
export interface Lead {
  id: string;
  eventId: string;
  formData: LeadFormData;
  leapCustomerId?: string;
  leapJobId?: string;
  leapAppointmentId?: string;
  syncedToLeap: boolean;
  syncErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Services types
export interface Service {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// LEAP CRM types (based on your existing API)
export interface LeapCustomer {
  id: string | number;
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phones: {
    number: string;
    type: 'home' | 'work' | 'mobile' | 'other';
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
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface LeapJob {
  id: string | number;
  number: string;
  customer_id: string | number;
  name: string;
  description?: string;
  status: 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
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
  created_at: string;
  updated_at: string;
}

export interface LeapAppointment {
  id: string | number;
  job_id: string | number;
  date: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

// Configuration types
export interface AppConfig {
  server: {
    port: number;
    corsOrigins: string[];
  };
  database: {
    mongoUri: string;
  };
  leap: {
    apiToken: string;
    baseUrl: string;
  };
  app: {
    currentEventId?: string;
    defaultServices: string[];
  };
}
