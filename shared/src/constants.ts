// API endpoints
export const API_ENDPOINTS = {
  // Events
  EVENTS: '/api/events',
  EVENTS_BY_ID: (id: string) => `/api/events/${id}`,
  SET_ACTIVE_EVENT: '/api/events/set-active',
  
  // Staff
  STAFF: '/api/staff',
  STAFF_BY_ID: (id: string) => `/api/staff/${id}`,
  STAFF_AVAILABILITY: (id: string) => `/api/staff/${id}/availability`,
  
  // Services
  SERVICES: '/api/services',
  SERVICES_BY_ID: (id: string) => `/api/services/${id}`,
  
  // Leads
  LEADS: '/api/leads',
  LEADS_BY_ID: (id: string) => `/api/leads/${id}`,
  SUBMIT_LEAD: '/api/leads/submit',
  
  // Configuration
  CONFIG: '/api/config',
  CURRENT_EVENT: '/api/config/current-event',
  
  // Health check
  HEALTH: '/api/health',
} as const;

// Default services that might be offered
export const DEFAULT_SERVICES = [
  'Roofing',
  'Gutters',
  'Siding',
  'Windows',
  'Doors',
  'Insulation',
  'Solar',
  'Other'
] as const;

// Phone number types
export const PHONE_TYPES = [
  'home',
  'work',
  'mobile',
  'other'
] as const;

// Lead status options
export const LEAD_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
  PROCESSING: 'processing'
} as const;

// Appointment statuses
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
} as const;

// Job statuses
export const JOB_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// Time slots (customized to 3 specific times: 10 AM, 2 PM, 5 PM)
export const DEFAULT_TIME_SLOTS = [
  '10:00 AM',
  '2:00 PM',
  '5:00 PM'
] as const;

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PHONE: 'Please enter a valid phone number',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  INVALID_DATE: 'Please enter a valid date',
  INVALID_TIME: 'Please enter a valid time',
  FUTURE_DATE: 'Date must be in the future'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred',
  NETWORK: 'Network error. Please check your connection.',
  SERVER: 'Server error. Please try again later.',
  NOT_FOUND: 'Resource not found',
  VALIDATION: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  LEAP_SYNC_FAILED: 'Failed to sync with LEAP CRM',
  EVENT_NOT_FOUND: 'Event not found',
  STAFF_NOT_FOUND: 'Staff member not found',
  SERVICE_NOT_FOUND: 'Service not found',
  LEAD_NOT_FOUND: 'Lead not found'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LEAD_SUBMITTED: 'Lead submitted successfully!',
  EVENT_CREATED: 'Event created successfully!',
  EVENT_UPDATED: 'Event updated successfully!',
  EVENT_DELETED: 'Event deleted successfully!',
  STAFF_CREATED: 'Staff member created successfully!',
  STAFF_UPDATED: 'Staff member updated successfully!',
  STAFF_DELETED: 'Staff member deleted successfully!',
  SERVICE_CREATED: 'Service created successfully!',
  SERVICE_UPDATED: 'Service updated successfully!',
  SERVICE_DELETED: 'Service deleted successfully!',
  LEAP_SYNC_SUCCESS: 'Successfully synced with LEAP CRM!'
} as const;
