#!/usr/bin/env node

const API_BASE_URL = 'https://eventcollect-production.up.railway.app/api';

async function testReferralSync() {
    console.log('🔄 Testing referral data sync to LEAP CRM...\n');
    
    // Create a test lead with specific event name to verify referral handling
    const testLead = {
        fullName: 'Referral Test User',
        email: `referral-test-${Date.now()}@example.com`,
        phone: '555-123-4567',
        address: {
            street: '123 Ref Test St',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601'
        },
        servicesOfInterest: ['Bathroom Remodel'],
        notes: 'Test lead to verify referral field handling',
        eventName: 'Summer Home Show 2025', // This should go in the referral note field
        wantsAppointment: false
    };
    
    try {
        console.log('📝 Creating test lead with event:', testLead.eventName);
        const response = await fetch(`${API_BASE_URL}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testLead)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Test lead created successfully');
            console.log(`- Lead ID: ${result.data._id}`);
            console.log(`- Sync Status: ${result.data.syncStatus}`);
            console.log(`- Event Name: ${result.data.eventName}`);
            
            if (result.data.syncStatus === 'synced') {
                console.log('✅ Lead synced to LEAP CRM');
                console.log(`- LEAP Prospect ID: ${result.data.leapProspectId || 'Not available'}`);
                
                console.log('\n🔍 Expected LEAP referral data:');
                console.log('- referred_by_type: "other"');
                console.log(`- referred_by_note: "${testLead.eventName}"`);
                
                console.log('\n💡 Check in LEAP CRM that:');
                console.log('1. Referral source is set to "Other"');
                console.log(`2. Referral note contains "${testLead.eventName}"`);
                
            } else if (result.data.syncStatus === 'error') {
                console.log('❌ Lead sync failed:', result.data.syncError);
            } else {
                console.log('⏳ Lead sync is pending...');
            }
            
        } else {
            console.log('❌ Failed to create test lead:', result.error);
        }
        
    } catch (error) {
        console.log('❌ Error during test:', error.message);
    }
    
    // Also test the direct sync endpoint
    console.log('\n🔄 Testing direct LEAP sync endpoint...');
    
    try {
        const syncData = {
            fullName: 'Direct Sync Test',
            email: `direct-sync-${Date.now()}@example.com`,
            phone: '555-987-6543',
            address: {
                street: '456 Direct Test Ave',
                city: 'Chicago', 
                state: 'IL',
                zipCode: '60602'
            },
            servicesOfInterest: ['Kitchen Remodel'],
            notes: 'Direct sync test for referral verification',
            eventName: 'Spring Trade Show 2025' // This should show up as referral
        };
        
        const syncResponse = await fetch(`${API_BASE_URL}/leap-sync/sync-lead`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(syncData)
        });
        
        const syncResult = await syncResponse.json();
        
        if (syncResult.success) {
            console.log('✅ Direct sync successful');
            console.log(`- LEAP Response Data Available: ${!!syncResult.data}`);
            console.log(`- Event Name Used: ${syncData.eventName}`);
            
            console.log('\n🔍 Expected in LEAP CRM:');
            console.log('- Referral Type: "Other"');
            console.log(`- Referral Note: "${syncData.eventName}"`);
            
        } else {
            console.log('❌ Direct sync failed:', syncResult.error);
        }
        
    } catch (error) {
        console.log('❌ Direct sync error:', error.message);
    }
}

testReferralSync().catch(console.error);
