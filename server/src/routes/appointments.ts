import express, { Request, Response } from 'express';
import { appointmentService } from '../services/appointmentService';
import { logger } from '../utils/logger';

const router = express.Router();

// Create a new appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      date,
      timeSlot,
      address,
      servicesOfInterest,
      notes,
      staffMemberId,
      staffMemberName,
      tradeIds,
      salesRepId,
      leadId,
      leapProspectId,
      eventName,
      createdBy
    } = req.body;

    logger.info('Creating appointment via API', { 
      customerEmail, 
      date, 
      timeSlot 
    });

    // Validate required fields
    if (!customerName || !customerEmail || !customerPhone || !date || !timeSlot || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerName, customerEmail, customerPhone, date, timeSlot, address'
      });
    }

    // Parse date
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const appointmentData = {
      customerName,
      customerEmail,
      customerPhone,
      date: appointmentDate,
      timeSlot,
      address,
      servicesOfInterest: servicesOfInterest || [],
      notes,
      staffMemberId,
      staffMemberName,
      tradeIds,
      salesRepId,
      leadId,
      leapProspectId,
      eventName,
      createdBy
    };

    const appointment = await appointmentService.createAppointment(appointmentData);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });
  } catch (error: any) {
    logger.error('Failed to create appointment via API', { 
      error: error.message,
      requestBody: req.body
    });
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get appointments within a date range
router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, staffMemberId, customerEmail } = req.query;

    logger.info('Getting appointments via API', { 
      startDate, 
      endDate, 
      status, 
      staffMemberId, 
      customerEmail 
    });

    // Default to current week if no dates provided
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (staffMemberId) filters.staffMemberId = staffMemberId;
    if (customerEmail) filters.customerEmail = customerEmail;

    const appointments = await appointmentService.getAppointments(start, end, filters);

    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: appointments,
      count: appointments.length,
      dateRange: { startDate: start, endDate: end }
    });
  } catch (error: any) {
    logger.error('Failed to get appointments via API', { 
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get appointment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.info('Getting appointment by ID via API', { appointmentId: id });

    const appointment = await appointmentService.getAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: appointment
    });
  } catch (error: any) {
    logger.error('Failed to get appointment by ID via API', { 
      appointmentId: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    logger.info('Updating appointment via API', { 
      appointmentId: id,
      updateData
    });

    // Parse date if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
      if (isNaN(updateData.date.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
    }

    const updatedAppointment = await appointmentService.updateAppointment(id, updateData);

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });
  } catch (error: any) {
    logger.error('Failed to update appointment via API', { 
      appointmentId: req.params.id,
      error: error.message
    });
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy } = req.body;

    logger.info('Cancelling appointment via API', { 
      appointmentId: id,
      cancelledBy
    });

    const cancelledAppointment = await appointmentService.cancelAppointment(id, cancelledBy);

    if (!cancelledAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: cancelledAppointment
    });
  } catch (error: any) {
    logger.error('Failed to cancel appointment via API', { 
      appointmentId: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check availability
router.get('/availability/check', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, timeSlots } = req.query;

    logger.info('Checking availability via API', { 
      startDate, 
      endDate, 
      timeSlots 
    });

    // Default to current week if no dates provided
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // 4 weeks

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const timeSlotsArray = timeSlots ? (timeSlots as string).split(',') : undefined;

    const availability = await appointmentService.checkAvailability({
      startDate: start,
      endDate: end,
      timeSlots: timeSlotsArray
    });

    res.json({
      success: true,
      message: 'Availability checked successfully',
      data: availability,
      dateRange: { startDate: start, endDate: end },
      timeSlots: timeSlotsArray
    });
  } catch (error: any) {
    logger.error('Failed to check availability via API', { 
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get availability for a specific date
router.get('/availability/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    logger.info('Getting availability for date via API', { date });

    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const availability = await appointmentService.getAvailabilityForDate(appointmentDate);

    res.json({
      success: true,
      message: 'Availability retrieved successfully',
      data: availability
    });
  } catch (error: any) {
    logger.error('Failed to get availability for date via API', { 
      date: req.params.date,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Find next available appointment slot
router.get('/availability/next-available', async (req: Request, res: Response) => {
  try {
    const { startDate, timeSlots } = req.query;

    logger.info('Finding next available slot via API', { 
      startDate, 
      timeSlots 
    });

    const start = startDate ? new Date(startDate as string) : new Date();
    const timeSlotsArray = timeSlots ? (timeSlots as string).split(',') : undefined;

    // Validate start date
    if (startDate && isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const nextAvailable = await appointmentService.findNextAvailableSlot(start, timeSlotsArray);

    if (!nextAvailable) {
      return res.json({
        success: true,
        message: 'No availability found in the next 30 days',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Next available slot found',
      data: nextAvailable
    });
  } catch (error: any) {
    logger.error('Failed to find next available slot via API', { 
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get appointment statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    logger.info('Getting appointment statistics via API', { 
      startDate, 
      endDate 
    });

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const stats = await appointmentService.getAppointmentStats(start, end);

    res.json({
      success: true,
      message: 'Appointment statistics retrieved successfully',
      data: stats
    });
  } catch (error: any) {
    logger.error('Failed to get appointment statistics via API', { 
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
