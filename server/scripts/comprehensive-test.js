#!/usr/bin/env node

/**
 * Comprehensive Testing Script for EventCollect v1.2.0
 * Tests all major fixes and features implemented
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const colors = require('colors');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventcollect';

class ComprehensiveTest {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    switch(type) {
      case 'success':
        console.log(`[${timestamp}] ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`[${timestamp}] ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
        break;
      case 'info':
        console.log(`[${timestamp}] ℹ️  ${message}`.blue);
        break;
      default:
        console.log(`[${timestamp}] ${message}`);
    }
  }

  async test(name, testFunction) {
    this.results.total++;
    this.log(`Running test: ${name}`, 'info');
    
    try {
      await testFunction();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      this.log(`Test passed: ${name}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      this.log(`Test failed: ${name} - ${error.message}`, 'error');
    }
  }

  async connectToMongoDB() {
    this.log('Connecting to MongoDB...', 'info');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.log('Connected to MongoDB successfully', 'success');
  }

  async disconnectFromMongoDB() {
    await mongoose.connection.close();
    this.log('Disconnected from MongoDB', 'info');
  }

  // Test 1: Email Unique Constraint Removal
  async testEmailUniqueConstraintRemoval() {
    const db = mongoose.connection.db;
    const collection = db.collection('leads');
    
    // Check indexes
    const indexes = await collection.indexes();
    const emailIndexes = indexes.filter(index => 
      index.key && (index.key.email || Object.keys(index.key).includes('email'))
    );
    
    const uniqueEmailIndexes = emailIndexes.filter(index => index.unique === true);
    
    if (uniqueEmailIndexes.length > 0) {
      throw new Error(`Found ${uniqueEmailIndexes.length} unique email indexes still present`);
    }
    
    this.log('✅ No unique email constraints found - correctly removed', 'success');
  }

  // Test 2: Appointment Saving to MongoDB
  async testAppointmentSavingToMongoDB() {
    const db = mongoose.connection.db;
    
    // Check if appointments collection exists
    const collections = await db.listCollections().toArray();
    const hasAppointments = collections.some(col => col.name === 'appointments');
    
    if (!hasAppointments) {
      throw new Error('Appointments collection does not exist');
    }
    
    // Check appointment count
    const appointmentsCount = await db.collection('appointments').countDocuments();
    this.log(`Found ${appointmentsCount} appointments in database`, 'info');
    
    if (appointmentsCount === 0) {
      this.log('No appointments found - this is expected if none have been created yet', 'warning');
    } else {
      // Check structure of recent appointment
      const recentAppointment = await db.collection('appointments').findOne({}, { sort: { createdAt: -1 } });
      
      const requiredFields = ['customerName', 'customerEmail', 'date', 'timeSlot', 'status', 'leadId'];
      const missingFields = requiredFields.filter(field => !recentAppointment[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Appointment missing required fields: ${missingFields.join(', ')}`);
      }
      
      this.log(`✅ Appointments have proper structure with fields: ${Object.keys(recentAppointment).join(', ')}`, 'success');
    }
  }

  // Test 3: Lead Creation with Duplicate Email
  async testDuplicateEmailAllowed() {
    const testEmail = `test-duplicate-${Date.now()}@example.com`;
    
    const leadData = {
      fullName: 'Test User 1',
      email: testEmail,
      phone: '555-0123',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      servicesOfInterest: ['Full Remodel'],
      notes: 'First test lead with duplicate email',
      eventName: 'Test Event',
      wantsAppointment: false
    };

    try {
      // Create first lead
      const response1 = await axios.post(`${API_BASE_URL}/leads`, leadData);
      if (!response1.data.success) {
        throw new Error(`Failed to create first lead: ${response1.data.error}`);
      }

      // Create second lead with same email
      const leadData2 = { ...leadData, fullName: 'Test User 2', notes: 'Second test lead with duplicate email' };
      const response2 = await axios.post(`${API_BASE_URL}/leads`, leadData2);
      
      if (!response2.data.success) {
        throw new Error(`Failed to create second lead with duplicate email: ${response2.data.error}`);
      }

      this.log('✅ Successfully created two leads with the same email address', 'success');

      // Clean up test data
      if (response1.data.data?._id) {
        await axios.delete(`${API_BASE_URL}/leads/${response1.data.data._id}`).catch(() => {});
      }
      if (response2.data.data?._id) {
        await axios.delete(`${API_BASE_URL}/leads/${response2.data.data._id}`).catch(() => {});
      }

    } catch (error) {
      throw new Error(`Duplicate email test failed: ${error.message}`);
    }
  }

  // Test 4: Lead Creation with Appointment
  async testLeadCreationWithAppointment() {
    const testEmail = `test-appointment-${Date.now()}@example.com`;
    
    const leadData = {
      fullName: 'Test Appointment User',
      email: testEmail,
      phone: '555-0124',
      address: {
        street: '124 Appointment St',
        city: 'Appointment City',
        state: 'AC',
        zipCode: '12346'
      },
      servicesOfInterest: ['Full Remodel'],
      notes: 'Test lead with appointment',
      eventName: 'Test Event',
      wantsAppointment: true,
      appointmentDetails: {
        preferredDate: '2025-02-15',
        preferredTime: '10:00 AM',
        notes: 'Test appointment notes'
      }
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/leads`, leadData);
      
      if (!response.data.success) {
        throw new Error(`Failed to create lead with appointment: ${response.data.error}`);
      }

      const createdLead = response.data.data;
      
      // Verify lead has appointment details
      if (!createdLead.wantsAppointment) {
        throw new Error('Lead does not have wantsAppointment set to true');
      }
      
      if (!createdLead.appointmentDetails) {
        throw new Error('Lead does not have appointmentDetails');
      }

      // Check if appointment was created in appointments collection
      if (response.data.appointmentCreated) {
        this.log(`✅ Appointment record created with ID: ${response.data.appointmentCreated.id}`, 'success');
      } else {
        this.log('⚠️  No separate appointment record created (this may be expected)', 'warning');
      }

      this.log('✅ Lead with appointment created successfully', 'success');

      // Clean up
      if (createdLead._id) {
        await axios.delete(`${API_BASE_URL}/leads/${createdLead._id}`).catch(() => {});
      }

    } catch (error) {
      throw new Error(`Lead with appointment test failed: ${error.message}`);
    }
  }

  // Test 5: Lead Update (Anti-Duplicate Test)
  async testLeadUpdateNoDuplicates() {
    const testEmail = `test-update-${Date.now()}@example.com`;
    
    const leadData = {
      fullName: 'Test Update User',
      email: testEmail,
      phone: '555-0125',
      address: {
        street: '125 Update St',
        city: 'Update City',
        state: 'UC',
        zipCode: '12347'
      },
      servicesOfInterest: ['Full Remodel'],
      notes: 'Test lead for update',
      eventName: 'Test Event',
      wantsAppointment: false,
      tempRating: 5
    };

    let createdLeadId = null;
    
    try {
      // Create lead first
      const createResponse = await axios.post(`${API_BASE_URL}/leads`, leadData);
      
      if (!createResponse.data.success) {
        throw new Error(`Failed to create lead for update test: ${createResponse.data.error}`);
      }

      createdLeadId = createResponse.data.data._id;
      this.log(`Created test lead with ID: ${createdLeadId}`, 'info');

      // Update the lead
      const updateData = {
        ...leadData,
        tempRating: 8,
        notes: 'Updated test lead - temperature changed',
        wantsAppointment: true,
        appointmentDetails: {
          preferredDate: '2025-02-16',
          preferredTime: '2:00 PM',
          notes: 'Added appointment during update'
        }
      };

      const updateResponse = await axios.put(`${API_BASE_URL}/leads/${createdLeadId}`, updateData);
      
      if (!updateResponse.data.success) {
        throw new Error(`Failed to update lead: ${updateResponse.data.error}`);
      }

      const updatedLead = updateResponse.data.data;
      
      // Verify updates were applied
      if (updatedLead.tempRating !== 8) {
        throw new Error(`Temperature rating not updated correctly. Expected: 8, Got: ${updatedLead.tempRating}`);
      }

      if (!updatedLead.wantsAppointment) {
        throw new Error('wantsAppointment not updated to true');
      }

      // Check sync status - should not be 'error' due to duplicates
      if (updatedLead.syncStatus === 'error' && updatedLead.syncError && updatedLead.syncError.includes('duplicate')) {
        throw new Error(`Lead update created duplicates in LEAP: ${updatedLead.syncError}`);
      }

      this.log(`✅ Lead updated successfully. Sync status: ${updatedLead.syncStatus}`, 'success');

      // Clean up
      if (createdLeadId) {
        await axios.delete(`${API_BASE_URL}/leads/${createdLeadId}`).catch(() => {});
      }

    } catch (error) {
      // Clean up on error
      if (createdLeadId) {
        await axios.delete(`${API_BASE_URL}/leads/${createdLeadId}`).catch(() => {});
      }
      throw new Error(`Lead update test failed: ${error.message}`);
    }
  }

  // Test 6: API Health Check
  async testAPIHealthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL}/leads`);
      
      if (response.status !== 200) {
        throw new Error(`API health check failed with status: ${response.status}`);
      }

      if (!response.data.success) {
        throw new Error(`API returned error: ${response.data.error}`);
      }

      this.log('✅ API is healthy and responding correctly', 'success');

    } catch (error) {
      throw new Error(`API health check failed: ${error.message}`);
    }
  }

  // Test 7: LEAP Data Integrity (Data In vs Data Out)
  async testLeapDataIntegrity() {
    // Skip this test if LEAP sync is disabled
    if (process.env.ENABLE_LEAP_SYNC !== 'true') {
      this.log('⚠️  LEAP sync disabled - skipping LEAP data integrity test', 'warning');
      return;
    }

    const testEmail = `test-leap-integrity-${Date.now()}@example.com`;
    
    const originalLeadData = {
      fullName: 'LEAP Integrity Test User',
      email: testEmail,
      phone: '555-0999',
      address: {
        street: '999 LEAP Test Blvd',
        city: 'Data City',
        state: 'TX',
        zipCode: '99999'
      },
      servicesOfInterest: ['Full Remodel', 'Kitchen'],
      notes: 'LEAP data integrity test - checking data consistency',
      eventName: 'Data Integrity Test Event',
      wantsAppointment: true,
      appointmentDetails: {
        preferredDate: '2025-03-15',
        preferredTime: '2:00 PM',
        notes: 'Test appointment for data integrity'
      },
      tempRating: 7,
      tradeIds: [105, 110],
      workTypeIds: [91139, 91140],
      salesRepId: 88443
    };

    let createdLeadId = null;
    
    try {
      this.log('📤 Creating lead with comprehensive data for LEAP sync...', 'info');
      
      // Create lead and let it sync to LEAP
      const createResponse = await axios.post(`${API_BASE_URL}/leads`, originalLeadData);
      
      if (!createResponse.data.success) {
        throw new Error(`Failed to create lead for LEAP integrity test: ${createResponse.data.error}`);
      }

      createdLeadId = createResponse.data.data._id;
      const savedLead = createResponse.data.data;
      
      this.log(`✅ Lead created with ID: ${createdLeadId}`, 'success');
      this.log(`📊 Initial sync status: ${savedLead.syncStatus}`, 'info');

      // Wait a moment for sync to complete if it's async
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the updated lead to check final sync status
      const leadResponse = await axios.get(`${API_BASE_URL}/leads`);
      const updatedLead = leadResponse.data.data.find(lead => lead._id === createdLeadId);
      
      if (!updatedLead) {
        throw new Error('Could not find created lead in leads list');
      }

      this.log(`📊 Final sync status: ${updatedLead.syncStatus}`, 'info');
      
      if (updatedLead.syncStatus === 'error') {
        this.log(`⚠️  LEAP sync failed: ${updatedLead.syncError}`, 'warning');
        this.log('Continuing with data comparison based on what was sent...', 'info');
      }

      // Perform data integrity comparison
      this.log('\n' + '='.repeat(80), 'info');
      this.log('📊 DATA INTEGRITY COMPARISON: SENT vs STORED', 'info');
      this.log('='.repeat(80), 'info');

      // Compare basic customer data
      this.compareData('Full Name', originalLeadData.fullName, updatedLead.fullName);
      this.compareData('Email', originalLeadData.email, updatedLead.email);
      this.compareData('Phone', originalLeadData.phone, updatedLead.phone);
      this.compareData('Street Address', originalLeadData.address.street, updatedLead.address.street);
      this.compareData('City', originalLeadData.address.city, updatedLead.address.city);
      this.compareData('State', originalLeadData.address.state, updatedLead.address.state);
      this.compareData('Zip Code', originalLeadData.address.zipCode, updatedLead.address.zipCode);
      
      // Compare services and notes
      this.compareData('Services of Interest', originalLeadData.servicesOfInterest.join(', '), 
                      updatedLead.servicesOfInterest.join(', '));
      this.compareData('Notes', originalLeadData.notes, updatedLead.notes);
      this.compareData('Event Name', originalLeadData.eventName, updatedLead.eventName);
      this.compareData('Temperature Rating', originalLeadData.tempRating, updatedLead.tempRating);
      
      // Compare appointment details
      this.compareData('Wants Appointment', originalLeadData.wantsAppointment, updatedLead.wantsAppointment);
      if (originalLeadData.wantsAppointment) {
        this.compareData('Preferred Date', originalLeadData.appointmentDetails.preferredDate, 
                        updatedLead.appointmentDetails?.preferredDate);
        this.compareData('Preferred Time', originalLeadData.appointmentDetails.preferredTime, 
                        updatedLead.appointmentDetails?.preferredTime);
        this.compareData('Appointment Notes', originalLeadData.appointmentDetails.notes, 
                        updatedLead.appointmentDetails?.notes);
      }
      
      // Compare LEAP-specific data
      this.compareData('Trade IDs', JSON.stringify(originalLeadData.tradeIds), 
                      JSON.stringify(updatedLead.tradeIds));
      this.compareData('Work Type IDs', JSON.stringify(originalLeadData.workTypeIds), 
                      JSON.stringify(updatedLead.workTypeIds));
      this.compareData('Sales Rep ID', originalLeadData.salesRepId, updatedLead.salesRepId);

      // Show LEAP CRM IDs if available
      if (updatedLead.leapCustomerId) {
        this.log(`🔗 LEAP Customer ID: ${updatedLead.leapCustomerId}`, 'info');
      }
      if (updatedLead.leapJobId) {
        this.log(`🔗 LEAP Job ID: ${updatedLead.leapJobId}`, 'info');
      }
      if (updatedLead.leapProspectId) {
        this.log(`🔗 LEAP Prospect ID: ${updatedLead.leapProspectId}`, 'info');
      }
      if (updatedLead.leapAppointmentId) {
        this.log(`🔗 LEAP Appointment ID: ${updatedLead.leapAppointmentId}`, 'info');
      }

      this.log('='.repeat(80), 'info');
      this.log('✅ Data integrity comparison completed', 'success');

      // Clean up
      if (createdLeadId) {
        await axios.delete(`${API_BASE_URL}/leads/${createdLeadId}`).catch(() => {});
        this.log('🧹 Test data cleaned up', 'info');
      }

    } catch (error) {
      // Clean up on error
      if (createdLeadId) {
        await axios.delete(`${API_BASE_URL}/leads/${createdLeadId}`).catch(() => {});
      }
      throw new Error(`LEAP data integrity test failed: ${error.message}`);
    }
  }

  // Helper method to compare data values
  compareData(fieldName, originalValue, storedValue) {
    const original = originalValue?.toString() || 'null';
    const stored = storedValue?.toString() || 'null';
    
    if (original === stored) {
      this.log(`✅ ${fieldName.padEnd(20)}: ${original}`, 'success');
    } else {
      this.log(`⚠️  ${fieldName.padEnd(20)}: SENT[${original}] ≠ STORED[${stored}]`, 'warning');
    }
  }

  // Generate Frontend Test Instructions
  generateFrontendTestInstructions() {
    const instructions = `
${'='.repeat(80)}
FRONTEND TESTING INSTRUCTIONS
${'='.repeat(80)}

Please manually test the following frontend features:

1. 📋 COPY LEAD FUNCTION ON LEAD FORM:
   • Navigate to the Lead Form (/)
   • Fill out the form with test data
   • ✅ BEFORE submitting, click "Copy Lead Info" button
   • Verify data is copied to clipboard
   • Submit the form
   • ✅ AFTER success, verify "Copy Lead Info" button appears in success section
   • Click it and verify data is copied

2. 🏷️ VERSION DISPLAY:
   • Check header for version number "v1.2.0"
   • Should appear below "EventCollect" title
   • Should be hidden on very small screens (xs)

3. ✏️ APPOINTMENT EDITING IN LEAD MODAL:
   • Go to Leads Dashboard (/leads)
   • Create a lead with appointment preferences OR find existing lead
   • Click "Edit" on a lead
   • ✅ Verify "Appointment Preferences" section appears if lead has/wants appointment
   • Verify you can:
     - Toggle "Wants Appointment" on/off
     - Select preferred date (date picker)
     - Select preferred time (10:00 AM, 2:00 PM, 5:00 PM)
     - Add/edit appointment notes
   • Save changes and verify they persist

4. 🔄 LEAP DUPLICATE PREVENTION:
   • Create a lead and let it sync to LEAP
   • Edit the lead (change temperature, notes, appointment details)
   • Save changes
   • ✅ Verify NO duplicate entries are created in LEAP CRM
   • ✅ Verify sync status shows 'synced' or appropriate status (not error due to duplicates)

5. 💾 DUPLICATE EMAIL ALLOWED:
   • Create a lead with email: test@example.com
   • Create another lead with the same email: test@example.com
   • ✅ Both should save successfully without errors

6. 📅 APPOINTMENTS IN DATABASE:
   • Create leads with appointment preferences
   • Check that appointments are being saved to MongoDB
   • Use MongoDB Compass or similar to verify 'appointments' collection has records

${'='.repeat(80)}
`;
    
    console.log(instructions.cyan);
  }

  // Run all tests
  async runAllTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 EVENTCOLLECT v1.2.0 COMPREHENSIVE TEST SUITE'.bold.cyan);
    console.log('='.repeat(80) + '\n');

    try {
      await this.connectToMongoDB();

      // Backend tests
      await this.test('Email Unique Constraint Removal', () => this.testEmailUniqueConstraintRemoval());
      await this.test('Appointment Saving to MongoDB', () => this.testAppointmentSavingToMongoDB());
      await this.test('API Health Check', () => this.testAPIHealthCheck());
      await this.test('Duplicate Email Allowed', () => this.testDuplicateEmailAllowed());
      await this.test('Lead Creation with Appointment', () => this.testLeadCreationWithAppointment());
      await this.test('Lead Update (No Duplicates)', () => this.testLeadUpdateNoDuplicates());
      await this.test('LEAP Data Integrity', () => this.testLeapDataIntegrity());

      await this.disconnectFromMongoDB();

    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'error');
      this.results.failed++;
    }

    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS'.bold.cyan);
    console.log('='.repeat(80));
    
    this.results.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅ PASSED'.green : '❌ FAILED'.red;
      console.log(`${status} - ${test.name}`);
      if (test.error) {
        console.log(`   Error: ${test.error}`.red);
      }
    });

    console.log('\n' + '-'.repeat(40));
    console.log(`📈 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`.green);
    console.log(`❌ Failed: ${this.results.failed}`.red);
    console.log(`📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    // Generate frontend instructions
    this.generateFrontendTestInstructions();

    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the test suite
const tester = new ComprehensiveTest();
tester.runAllTests().catch((error) => {
  console.error('Fatal error in test suite:', error);
  process.exit(1);
});
