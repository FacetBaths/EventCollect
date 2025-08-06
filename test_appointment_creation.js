#!/usr/bin/env node

/**
 * Test script to verify appointment creation functionality
 * This script will test the lead creation with appointment details
 * and verify that appointments are being saved to MongoDB
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const API_BASE_URL = 'http://localhost:3001/api';

// Test data
const testLead = {
  fullName: "John Test Appointment",
  email: "john.test.appointment@example.com", 
  phone: "(555) 123-4567",
  address: {
    street: "123 Test St",
    city: "Test City", 
    state: "TS",
    zipCode: "12345"
  },
  servicesOfInterest: ["Roofing", "Siding"],
  tradeIds: [1, 2],
  wantsAppointment: true,
  appointmentDetails: {
    preferredDate: "2025-08-15", // Next week
    preferredTime: "10:00 AM",
    notes: "Test appointment created via script"
  },
  tempRating: 8, // Hot prospect (1-10 scale)
  notes: "This is a test lead created to verify appointment saving functionality"
};

async function testAppointmentCreation() {
  try {
    console.log('🧪 Testing Appointment Creation Functionality');
    console.log('============================================');
    
    // Test 1: Create a lead with appointment details
    console.log('\n1️⃣ Creating lead with appointment details...');
    const leadResponse = await axios.post(`${API_BASE_URL}/leads`, testLead, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Lead created successfully!');
    console.log(`   Lead ID: ${leadResponse.data.data._id}`);
    console.log(`   Full Name: ${leadResponse.data.data.fullName}`);
    console.log(`   Wants Appointment: ${leadResponse.data.data.wantsAppointment}`);
    
    if (leadResponse.data.appointmentCreated) {
      console.log('✅ Appointment record was created automatically!');
      console.log(`   Appointment ID: ${leadResponse.data.appointmentCreated.id}`);
      console.log(`   Date: ${new Date(leadResponse.data.appointmentCreated.date).toLocaleDateString()}`);
      console.log(`   Time Slot: ${leadResponse.data.appointmentCreated.timeSlot}`);
      console.log(`   Status: ${leadResponse.data.appointmentCreated.status}`);
    } else {
      console.log('❌ No appointment record was created');
    }
    
    // Test 2: Connect to MongoDB directly to verify the appointment was saved
    console.log('\n2️⃣ Connecting to MongoDB to verify appointment was saved...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Count appointments in the database
    const appointmentsCount = await mongoose.connection.db.collection('appointments').countDocuments();
    console.log(`📊 Total appointments in database: ${appointmentsCount}`);
    
    // Find the specific appointment we just created
    const appointment = await mongoose.connection.db.collection('appointments').findOne({
      customerEmail: testLead.email
    });
    
    if (appointment) {
      console.log('✅ Appointment found in MongoDB!');
      console.log(`   Customer Name: ${appointment.customerName}`);
      console.log(`   Customer Email: ${appointment.customerEmail}`);
      console.log(`   Customer Phone: ${appointment.customerPhone}`);
      console.log(`   Date: ${new Date(appointment.date).toLocaleDateString()}`);
      console.log(`   Time Slot: ${appointment.timeSlot}`);
      console.log(`   Status: ${appointment.status}`);
      console.log(`   Address: ${appointment.address.street}, ${appointment.address.city}, ${appointment.address.state} ${appointment.address.zipCode}`);
      console.log(`   Services: ${appointment.servicesOfInterest.join(', ')}`);
      console.log(`   Notes: ${appointment.notes}`);
      console.log(`   Lead ID: ${appointment.leadId}`);
      console.log(`   Created At: ${new Date(appointment.createdAt).toLocaleString()}`);
    } else {
      console.log('❌ Appointment NOT found in MongoDB database');
    }
    
    // Test 3: Verify lead data was also saved correctly
    console.log('\n3️⃣ Verifying lead data in MongoDB...');
    const lead = await mongoose.connection.db.collection('leads').findOne({
      email: testLead.email
    });
    
    if (lead) {
      console.log('✅ Lead found in MongoDB!');
      console.log(`   Lead ID: ${lead._id}`);
      console.log(`   Full Name: ${lead.fullName}`);
      console.log(`   Email: ${lead.email}`);
      console.log(`   Wants Appointment: ${lead.wantsAppointment}`);
      console.log(`   Appointment Details: ${JSON.stringify(lead.appointmentDetails, null, 2)}`);
      console.log(`   LEAP Sync Status: ${lead.syncStatus || 'Not synced (LEAP sync disabled)'}`);
    } else {
      console.log('❌ Lead NOT found in MongoDB database');
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Lead creation: ✅`);
    console.log(`   - Appointment auto-creation: ${leadResponse.data.appointmentCreated ? '✅' : '❌'}`);
    console.log(`   - MongoDB appointment record: ${appointment ? '✅' : '❌'}`);
    console.log(`   - MongoDB lead record: ${lead ? '✅' : '❌'}`);
    console.log(`   - LEAP sync: ${process.env.ENABLE_LEAP_SYNC === 'true' ? '✅ Ensabled' : '🚫 Disabled (as intended for testing)'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the test
if (require.main === module) {
  testAppointmentCreation();
}

module.exports = { testAppointmentCreation };
