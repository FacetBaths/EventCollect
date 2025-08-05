import axios from 'axios';
import type { LeadFormData } from '../types/temp-types';

// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '/api' 
  : 'https://eventcollect-production.up.railway.app/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    return Promise.reject(error);
  },
);

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API service functions
export const apiService = {
  // Health check
  async healthCheck(): Promise<ApiResponse<any>> {
    const response = await api.get('/health');
    return response.data;
  },

  // Lead management
  async submitLead(leadData: LeadFormData): Promise<ApiResponse<any>> {
    const response = await api.post('/leads', leadData);
    return response.data;
  },

  async getLeads(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/leads');
    return response.data;
  },

  async getLeadById(id: string): Promise<ApiResponse<any>> {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  async updateLead(id: string, leadData: any): Promise<ApiResponse<any>> {
    const response = await api.put(`/leads/${id}`, leadData);
    return response.data;
  },

  async deleteLead(id: string): Promise<ApiResponse<any>> {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  async resyncLead(id: string): Promise<ApiResponse<any>> {
    const response = await api.post(`/leads/${id}/resync`);
    return response.data;
  },

  async syncPendingLeads(): Promise<ApiResponse<any>> {
    const response = await api.post('/leads/sync-pending');
    return response.data;
  },

  // LEAP CRM sync
  async testLeapConnection(): Promise<ApiResponse<any>> {
    const response = await api.get('/leap-sync/test-connection');
    return response.data;
  },

  async syncAllLeapData(): Promise<ApiResponse<any>> {
    const response = await api.post('/leap-sync/resync-all');
    return response.data;
  },

  async syncLeadToLeap(leadData: LeadFormData): Promise<ApiResponse<any>> {
    const response = await api.post('/leap-sync/sync-lead', leadData);
    return response.data;
  },

  async getAppointments(startDate?: string, endDate?: string, userId?: string): Promise<ApiResponse<any>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (userId) params.userId = userId;
    
    // Try local appointment system first, fallback to LEAP
    try {
      const response = await api.get('/appointments', { params });
      return response.data;
    } catch (error) {
      console.warn('Local appointments failed, trying LEAP sync endpoint:', error);
      const response = await api.get('/leap-sync/appointments', { params });
      return response.data;
    }
  },

  async checkAppointmentAvailability(date: string, timeSlots?: string[], userId?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = { 
        startDate: date, 
        endDate: date 
      };
      if (timeSlots) params.timeSlots = timeSlots.join(',');
      if (userId) params.userId = userId;
      
      console.log('API Service - Calling availability endpoint with params:', params);
      
      // Try local appointment availability first
      try {
        const response = await api.get('/appointments/availability/check', { params });
        console.log('API Service - Local availability response:', response.data);
        return response.data;
      } catch (localError) {
        console.warn('Local availability failed, trying LEAP sync:', localError);
      // Fallback to LEAP sync endpoint
      const leapParams: any = { date };
      if (timeSlots) leapParams.timeSlots = timeSlots.join(',');
      if (userId) leapParams.userId = userId;
        
        const response = await api.get('/leap-sync/availability', { params: leapParams });
        console.log('API Service - LEAP availability response:', response.data);
        return response.data;
      }
    } catch (error: any) {
      console.error('API Service - Error in checkAppointmentAvailability:', error);
      console.error('API Service - Error response:', error.response?.data);
      throw error;
    }
  },

  async findNextAvailableMonday(timeSlots?: string[], userId?: string): Promise<ApiResponse<any>> {
    const params: any = {};
    if (timeSlots) params.timeSlots = timeSlots.join(',');
    if (userId) params.userId = userId;
    
    const response = await api.get('/leap-sync/next-monday', { params });
    return response.data;
  },

  // Get LEAP CRM company trades
  async getCompanyTrades(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/leap-sync/trades');
    return response.data;
  },

 // Get LEAP CRM divisions
  async getDivisions(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/leap-sync/divisions');
    return response.data;
  },

  // Get LEAP CRM sales reps
  async getSalesReps(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/leap-sync/sales-reps');
    return response.data;
  },

  // Get customer by ID from LEAP CRM
  async getCustomerById(customerId: string | number): Promise<ApiResponse<any>> {
    const response = await api.get(`/leap-sync/customers/${customerId}`);
    return response.data;
  },

  // Create appointment in LEAP CRM
  async createAppointment(appointmentData: any): Promise<ApiResponse<any>> {
    const response = await api.post('/leap-sync/appointments', appointmentData);
    return response.data;
  },

  // Events management
  async getEvents(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/events');
    return response.data;
  },

  async getActiveEvent(): Promise<ApiResponse<any>> {
    const response = await api.get('/events/active');
    return response.data;
  },

  async createEvent(eventData: any): Promise<ApiResponse<any>> {
    const response = await api.post('/events', eventData);
    return response.data;
  },

  async updateEvent(id: string, eventData: any): Promise<ApiResponse<any>> {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
  },

  async activateEvent(id: string): Promise<ApiResponse<any>> {
    const response = await api.put(`/events/${id}/activate`);
    return response.data;
  },

  async deleteEvent(id: string): Promise<ApiResponse<any>> {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  // Staff management
  async getStaff(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/staff');
    return response.data;
  },

  async createStaff(staffData: any): Promise<ApiResponse<any>> {
    const response = await api.post('/staff', staffData);
    return response.data;
  },

  async updateStaff(id: string, staffData: any): Promise<ApiResponse<any>> {
    const response = await api.put(`/staff/${id}`, staffData);
    return response.data;
  },

  async deleteStaff(id: string): Promise<ApiResponse<any>> {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },

  // Local appointment management

  async getAppointmentById(id: string): Promise<ApiResponse<any>> {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  async updateAppointment(id: string, updateData: any): Promise<ApiResponse<any>> {
    const response = await api.put(`/appointments/${id}`, updateData);
    return response.data;
  },

  async cancelAppointment(id: string, cancelledBy?: string): Promise<ApiResponse<any>> {
    const response = await api.delete(`/appointments/${id}`, { 
      data: { cancelledBy } 
    });
    return response.data;
  },

  async getAvailabilityForDate(date: string): Promise<ApiResponse<any>> {
    const response = await api.get(`/appointments/availability/${date}`);
    return response.data;
  },

  async findNextAvailableAppointment(startDate?: string, timeSlots?: string[]): Promise<ApiResponse<any>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (timeSlots) params.timeSlots = timeSlots.join(',');
    
    const response = await api.get('/appointments/availability/next-available', { params });
    return response.data;
  },

  async getAppointmentStats(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/appointments/stats/summary', { params });
    return response.data;
  },
};

export default api;
