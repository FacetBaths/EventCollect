const axios = require('axios');

// First, let's test customer creation separately
async function testCustomerCreation() {
  try {
    console.log('🧪 Testing customer creation only...\n');
    
    const customerTestData = {
      fullName: "Debug Test Customer",
      email: "debug.test@example.com", 
      phone: "555-999-8888",
      address: {
        street: "456 Debug Street",
        city: "Chicago",
        state: "IL",
        zipCode: "60602"
      },
      servicesOfInterest: ["Vanity"],
      notes: "Debug test - customer creation only",
      wantsAppointment: false,
      eventName: "Debug Test",
      // Don't include workTypeIds or other job-specific data
    };
    
    console.log('Customer test data:', JSON.stringify(customerTestData, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/leads', customerTestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Customer creation result:', response.data.data.syncStatus);
    
    if (response.data.data.syncStatus === 'synced') {
      console.log('🎉 Customer created successfully!');
      console.log(`Customer ID: ${response.data.data.leapCustomerId}`);
      return response.data.data.leapCustomerId;
    } else {
      console.log('❌ Customer creation failed:', response.data.data.syncError);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Customer test failed:', error.response?.data || error.message);
    return null;
  }
}

// Test job creation using LEAP API directly
async function testJobCreationDirect() {
  try {
    console.log('\n🔧 Testing direct job creation via LEAP API...\n');
    
    // Get a customer ID first from customer creation test
    const customerId = await testCustomerCreation();
    
    if (!customerId) {
      console.log('⚠️ Cannot test job creation without valid customer ID');
      return;
    }
    
    // Now test job creation with minimal data
    const minimalJobData = {
      customer_id: customerId,
      name: "Test Job - Minimal",
      description: "Testing minimal job creation",
      trades: [105], // BATH REMODEL
      call_required: 0,
      appointment_required: 0,
      duration: "0:0:0",
      same_as_customer_address: 1,
      address: "456 Debug Street",
      city: "Chicago",
      state_id: 14,
      country_id: 1,
      zip: "60602",
      insurance: 0,
      address_line_1: "456 Debug Street"
    };
    
    console.log('\n📋 Testing minimal job data:');
    console.log(JSON.stringify(minimalJobData, null, 2));
    
    // Use the LEAP sync API to create job directly
    const jobResponse = await axios.post('http://localhost:3001/api/leap-sync/sync-lead', {
      fullName: "Debug Job Test",
      email: "debug.job@example.com",
      phone: "555-888-7777",
      address: {
        street: "456 Debug Street",
        city: "Chicago",
        state: "IL",
        zipCode: "60602"
      },
      servicesOfInterest: ["Vanity"],
      notes: "Testing job creation directly",
      eventName: "Debug Job Test"
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📊 Direct job creation result:');
    console.log(JSON.stringify(jobResponse.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Direct job test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

// Run the debug tests
async function runDebugTests() {
  console.log('🚀 Starting LEAP debug tests...\n');
  
  // First test customer creation only
  await testCustomerCreation();
  
  // Then test job creation
  await testJobCreationDirect();
}

runDebugTests();
