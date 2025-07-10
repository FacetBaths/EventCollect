const axios = require('axios');

// Test data that simulates a lead submission with work type IDs
const testLeadData = {
  fullName: "John Test Customer",
  email: "john.test@example.com", 
  phone: "555-123-4567",
  address: {
    street: "123 Test Street",
    city: "Chicago",
    state: "IL",
    zipCode: "60601"
  },
  servicesOfInterest: ["Vanity", "Shower Update"],
  tradeIds: [105], // BATH REMODEL
  workTypeIds: [83498, 83506], // Vanity (83498) and Shower Update (83506) from LEAP
  salesRepId: 88392, // Alex Upshaw - real sales rep ID
  callCenterRepId: 88443, // BDC Rep ID
  notes: "Test lead to verify LEAP job creation with correct structure",
  wantsAppointment: false,
  eventName: "Test Event",
  referredBy: "Test Event",
  referred_by_type: "Event",
  referred_by_id: 8,
  referred_by_note: "Test Event"
};

async function testLeapJobCreation() {
  try {
    console.log('Testing LEAP job creation with new structure...');
    console.log('Test data:', JSON.stringify(testLeadData, null, 2));
    
    const response = await axios.post('http://localhost:3001/api/leads', testLeadData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Lead submission successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      const lead = response.data.data;
      console.log('\n📊 Lead Details:');
      console.log(`Lead ID: ${lead._id}`);
      console.log(`LEAP Customer ID: ${lead.leapCustomerId}`);
      console.log(`LEAP Job ID: ${lead.leapJobId}`);
      console.log(`Sync Status: ${lead.syncStatus}`);
      
      if (lead.syncStatus === 'synced') {
        console.log('\n🎉 LEAP sync successful! Check the server logs to verify:');
        console.log('1. Trade is set to BATH REMODEL (105)');
        console.log('2. work_types[] contains the selected work type IDs');
        console.log('3. rep_ids[] contains the BDC rep ID (88443)'); 
        console.log('4. estimator_ids[] contains the sales rep ID');
      } else if (lead.syncStatus === 'error') {
        console.log(`\n❌ LEAP sync failed: ${lead.syncError}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Error details:', error.response.data.details);
    }
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
    if (error.response?.headers) {
      console.error('Response headers:', error.response.headers);
    }
  }
}

// Run the test
testLeapJobCreation();
