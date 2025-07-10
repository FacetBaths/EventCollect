const axios = require('axios');

async function testLeapData() {
  try {
    console.log('Testing LEAP API data endpoints...\n');
    
    // Test connection
    console.log('1. Testing LEAP connection...');
    const connectionTest = await axios.get('http://localhost:3001/api/leap-sync/test-connection');
    console.log('✅ Connection test:', connectionTest.data.success ? 'SUCCESS' : 'FAILED');
    
    // Get trades
    console.log('\n2. Getting LEAP trades...');
    const tradesResponse = await axios.get('http://localhost:3001/api/leap-sync/trades');
    console.log('✅ Trades retrieved:', tradesResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    if (tradesResponse.data.success && tradesResponse.data.data) {
      console.log(`Found ${tradesResponse.data.data.length} trades`);
      
      // Find BATH REMODEL trade
      const bathRemodelTrade = tradesResponse.data.data.find(trade => 
        trade.name && trade.name.includes('BATH REMODEL')
      );
      
      if (bathRemodelTrade) {
        console.log('\\n📋 BATH REMODEL Trade Details:');
        console.log(`ID: ${bathRemodelTrade.id}`);
        console.log(`Name: ${bathRemodelTrade.name}`);
        console.log(`Color: ${bathRemodelTrade.color || 'None'}`);
        
        if (bathRemodelTrade.work_types && bathRemodelTrade.work_types.data) {
          console.log(`\\n🔧 Work Types (${bathRemodelTrade.work_types.data.length}):`);
          bathRemodelTrade.work_types.data.forEach((workType, index) => {
            console.log(`  ${index + 1}. ${workType.name} (ID: ${workType.id})`);
          });
          
          // Suggest some work type IDs for testing
          const sampleWorkTypes = bathRemodelTrade.work_types.data.slice(0, 3);
          console.log('\\n💡 Sample work type IDs for testing:');
          console.log(JSON.stringify(sampleWorkTypes.map(wt => wt.id)));
        } else {
          console.log('No work types found in BATH REMODEL trade');
        }
      } else {
        console.log('\\n⚠️  BATH REMODEL trade not found');
        console.log('Available trades:');
        tradesResponse.data.data.forEach(trade => {
          console.log(`  - ${trade.name} (ID: ${trade.id})`);
        });
      }
    }
    
    // Get sales reps
    console.log('\\n3. Getting sales reps...');
    const repsResponse = await axios.get('http://localhost:3001/api/leap-sync/sales-reps');
    console.log('✅ Sales reps retrieved:', repsResponse.data.success ? 'SUCCESS' : 'FAILED');
    
    if (repsResponse.data.success && repsResponse.data.data) {
      console.log(`Found ${repsResponse.data.data.length} sales reps`);
      
      // Find BDC rep
      const bdcRep = repsResponse.data.data.find(rep => 
        rep.email && rep.email.includes('bdc') || 
        (rep.first_name && rep.first_name.toLowerCase().includes('bdc')) ||
        rep.id === 88443
      );
      
      if (bdcRep) {
        console.log('\\n👤 BDC Rep found:');
        console.log(`ID: ${bdcRep.id}`);
        console.log(`Name: ${bdcRep.first_name} ${bdcRep.last_name}`);
        console.log(`Email: ${bdcRep.email}`);
      }
      
      // Show a few sample reps for testing
      console.log('\\n👥 Sample sales reps for testing:');
      repsResponse.data.data.slice(0, 3).forEach(rep => {
        console.log(`  - ${rep.first_name} ${rep.last_name} (ID: ${rep.id}) - ${rep.email}`);
      });
    }
    
  } catch (error) {
    console.error('\\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('HTTP Status:', error.response.status);
    }
  }
}

// Run the test
testLeapData();
