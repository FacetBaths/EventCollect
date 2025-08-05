#!/usr/bin/env node

const API_BASE_URL = 'https://eventcollect-production.up.railway.app/api';

async function testLeapSync() {
    console.log('Testing LEAP sync functionality...');
    
    // Test 1: Check LEAP connection
    try {
        const response = await fetch(`${API_BASE_URL}/leap-sync/test-connection`);
        const result = await response.json();
        console.log('✓ LEAP connection test:', result.success ? 'PASSED' : 'FAILED');
    } catch (error) {
        console.log('✗ LEAP connection test: FAILED', error.message);
    }
    
    // Test 2: Get all leads to check sync status
    try {
        const response = await fetch(`${API_BASE_URL}/leads`);
        const result = await response.json();
        
        if (result.success) {
            const leads = result.data;
            console.log(`\n📊 Lead Status Summary:`);
            console.log(`Total leads: ${leads.length}`);
            
            const pendingLeads = leads.filter(lead => lead.syncStatus === 'pending');
            const syncedLeads = leads.filter(lead => lead.syncStatus === 'synced');
            const errorLeads = leads.filter(lead => lead.syncStatus === 'error');
            
            console.log(`- Pending: ${pendingLeads.length}`);
            console.log(`- Synced: ${syncedLeads.length}`);
            console.log(`- Error: ${errorLeads.length}`);
            
            if (pendingLeads.length > 0) {
                console.log(`\n📋 Pending leads (showing first 5):`);
                pendingLeads.slice(0, 5).forEach((lead, index) => {
                    console.log(`${index + 1}. ${lead.fullName} - ${lead.email} (Created: ${new Date(lead.createdAt).toLocaleString()})`);
                });
            }
        }
    } catch (error) {
        console.log('✗ Failed to get leads:', error.message);
    }
    
    // Test 3: Create a test lead to verify automatic sync
    console.log('\n🧪 Testing new lead creation with automatic sync...');
    const testLead = {
        fullName: 'Test User Sync',
        email: `test-sync-${Date.now()}@example.com`,
        phone: '555-012-3456',
        address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'IL',
            zipCode: '12345'
        },
        servicesOfInterest: ['Roofing'],
        notes: 'Test lead for sync verification'
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testLead)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✓ Test lead created successfully');
            console.log(`- Lead ID: ${result.data._id}`);
            console.log(`- Sync Status: ${result.data.syncStatus}`);
            
            if (result.data.syncStatus === 'synced') {
                console.log('✓ Automatic sync WORKING!');
                console.log(`- LEAP Prospect ID: ${result.data.leapProspectId}`);
            } else if (result.data.syncStatus === 'pending') {
                console.log('⚠️  Automatic sync still pending - may need environment variable fix');
            } else if (result.data.syncStatus === 'error') {
                console.log('✗ Automatic sync failed:', result.data.syncError);
            }
        } else {
            console.log('✗ Failed to create test lead:', result.error);
        }
    } catch (error) {
        console.log('✗ Error creating test lead:', error.message);
    }
}

testLeapSync().catch(console.error);
