#!/usr/bin/env node

const API_BASE_URL = 'https://eventcollect-production.up.railway.app/api';

async function syncPendingLeads() {
    console.log('🔄 Starting manual sync of pending leads to LEAP CRM...\n');
    
    try {
        // Get all leads
        const response = await fetch(`${API_BASE_URL}/leads`);
        const result = await response.json();
        
        if (!result.success) {
            console.log('❌ Failed to get leads:', result.error);
            return;
        }
        
        const leads = result.data;
        const pendingLeads = leads.filter(lead => lead.syncStatus === 'pending');
        
        console.log(`📊 Found ${pendingLeads.length} pending leads to sync\n`);
        
        if (pendingLeads.length === 0) {
            console.log('✅ No pending leads found!');
            return;
        }
        
        let syncCount = 0;
        let errorCount = 0;
        
        // Process each pending lead
        for (let i = 0; i < pendingLeads.length; i++) {
            const lead = pendingLeads[i];
            console.log(`🔄 [${i + 1}/${pendingLeads.length}] Syncing: ${lead.fullName} (${lead.email})`);
            
            try {
                const syncData = {
                    fullName: lead.fullName,
                    email: lead.email,
                    phone: lead.phone,
                    address: {
                        street: lead.address.street,
                        city: lead.address.city,
                        state: lead.address.state,
                        zipCode: lead.address.zipCode,
                    },
                    servicesOfInterest: lead.servicesOfInterest,
                    tradeIds: lead.tradeIds,
                    workTypeIds: lead.workTypeIds,
                    salesRepId: lead.salesRepId,
                    callCenterRepId: lead.callCenterRepId,
                    notes: lead.notes || "",
                    eventName: lead.eventName || "Web Form Submission",
                    referredBy: lead.referredBy,
                    referred_by_type: lead.referred_by_type,
                    referred_by_id: lead.referred_by_id,
                    referred_by_note: lead.referred_by_note,
                    appointmentDetails: lead.wantsAppointment ? {
                        preferredDate: lead.appointmentDetails?.preferredDate || "",
                        preferredTime: lead.appointmentDetails?.preferredTime || "",
                        notes: lead.appointmentDetails?.notes || "",
                    } : undefined,
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
                    console.log(`  ✅ Successfully synced - LEAP ID: ${syncResult.data?.data?.id || 'Unknown'}`);
                    syncCount++;
                } else {
                    console.log(`  ❌ Failed to sync: ${syncResult.error}`);
                    errorCount++;
                }
                
            } catch (error) {
                console.log(`  ❌ Error syncing lead: ${error.message}`);
                errorCount++;
            }
            
            // Add a small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`\n📊 Sync Summary:`);
        console.log(`✅ Successfully synced: ${syncCount} leads`);
        console.log(`❌ Failed to sync: ${errorCount} leads`);
        console.log(`📈 Success rate: ${Math.round((syncCount / pendingLeads.length) * 100)}%`);
        
        if (syncCount > 0) {
            console.log(`\n🎉 Great! ${syncCount} leads have been successfully synced to LEAP CRM.`);
            console.log(`You can now check the leads dashboard to see their updated status.`);
        }
        
    } catch (error) {
        console.log('❌ Error during sync process:', error.message);
    }
}

syncPendingLeads().catch(console.error);
