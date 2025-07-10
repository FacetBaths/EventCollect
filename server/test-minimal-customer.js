const axios = require('axios');

async function testMinimalCustomer() {
  try {
    console.log('🧪 Testing minimal customer creation...\n');
    
    // Create customer data with only required fields
    const minimalCustomerData = {
      fullName: "Minimal Test",
      email: "minimal.test@example.com", 
      phone: "555-000-0001",
      address: {
        street: "123 Minimal St",
        city: "Chicago",
        state: "IL",
        zipCode: "60601"
      },
      servicesOfInterest: [], // Empty services
      notes: "Minimal test",
      wantsAppointment: false,
      eventName: "Minimal Test"
      // No optional fields like workTypeIds, salesRepId, etc.
    };
    
    console.log('Minimal customer data:', JSON.stringify(minimalCustomerData, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/leads', minimalCustomerData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Response received');
    console.log('Sync Status:', response.data.data.syncStatus);
    
    if (response.data.data.syncStatus === 'synced') {
      console.log('🎉 Minimal customer created successfully!');
      console.log(`Customer ID: ${response.data.data.leapCustomerId}`);
      console.log(`Job ID: ${response.data.data.leapJobId}`);
    } else if (response.data.data.syncStatus === 'error') {
      console.log('❌ Minimal customer creation failed:', response.data.data.syncError);
    }
    
  } catch (error) {
    console.error('❌ Minimal customer test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

// Test even more minimal - no job creation
async function testCustomerOnly() {
  try {
    console.log('\n🔍 Testing customer creation via LEAP sync API directly...\n');
    
    // Use the LEAP sync API with minimal data to create only customer
    const customerOnlyData = {
      fullName: "Customer Only Test",
      email: "customer.only@example.com",
      phone: "555-000-0002",
      address: {
        street: "456 Customer St",
        city: "Chicago", 
        state: "IL",
        zipCode: "60602"
      },
      servicesOfInterest: ["Vanity"],
      notes: "Customer only test",
      eventName: "Customer Only Test"
    };
    
    console.log('Customer only data:', JSON.stringify(customerOnlyData, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/leap-sync/sync-lead', customerOnlyData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📊 Direct LEAP sync result:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Customer only test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

// Run tests
async function runMinimalTests() {
  console.log('🚀 Starting minimal customer tests...\n');
  
  await testMinimalCustomer();
  await testCustomerOnly();
}

runMinimalTests();
