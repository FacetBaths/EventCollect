#!/usr/bin/env node

/**
 * Quick script to check the current state of the appointments collection
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// For development, use localhost MongoDB like the server does
const MONGODB_URI = process.env.NODE_ENV === 'production' 
  ? process.env.MONGODB_URI 
  : 'mongodb://localhost:27017/eventcollect';

console.log('🔍 Using database:', MONGODB_URI.includes('localhost') ? 'Local MongoDB (development)' : 'MongoDB Atlas (production)');

async function checkAppointments() {
  try {
    console.log('🔍 Checking Appointments Collection');
    console.log('==================================');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB:', MONGODB_URI.includes('localhost') ? 'Local Development' : 'Atlas Production');
    
    const db = mongoose.connection.db;
    
    // Get collection stats
    const appointmentsCount = await db.collection('appointments').countDocuments();
    console.log(`\n📊 Total appointments in database: ${appointmentsCount}`);
    
    if (appointmentsCount > 0) {
      console.log('\n📝 Recent appointments:');
      console.log('----------------------');
      
      const recentAppointments = await db.collection('appointments')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      recentAppointments.forEach((apt, index) => {
        console.log(`\n${index + 1}. ${apt.customerName}`);
        console.log(`   Email: ${apt.customerEmail}`);
        console.log(`   Phone: ${apt.customerPhone}`);
        console.log(`   Date: ${new Date(apt.date).toLocaleDateString()}`);
        console.log(`   Time: ${apt.timeSlot}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   Address: ${apt.address.street}, ${apt.address.city}, ${apt.address.state} ${apt.address.zipCode}`);
        console.log(`   Services: ${apt.servicesOfInterest.join(', ')}`);
        console.log(`   Created: ${new Date(apt.createdAt).toLocaleString()}`);
        if (apt.leadId) {
          console.log(`   Lead ID: ${apt.leadId}`);
        }
      });
    } else {
      console.log('\n📭 No appointments found in the database');
      console.log('   This is expected if you haven\'t created any leads with appointments yet');
    }
    
    // Also check leads for comparison
    const leadsCount = await db.collection('leads').countDocuments();
    console.log(`\n📊 Total leads in database: ${leadsCount}`);
    
    if (leadsCount > 0) {
      const leadsWithAppointments = await db.collection('leads').countDocuments({
        wantsAppointment: true
      });
      console.log(`📅 Leads that want appointments: ${leadsWithAppointments}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the check
if (require.main === module) {
  checkAppointments();
}

module.exports = { checkAppointments };
