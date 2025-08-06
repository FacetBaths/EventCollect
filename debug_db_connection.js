#!/usr/bin/env node

/**
 * Debug script to check database connection details
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function debugConnection() {
  try {
    console.log('🔍 Debugging Database Connection');
    console.log('================================');
    
    console.log('📋 Environment Variables:');
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    console.log(`📂 Connected to database: ${db.databaseName}`);
    
    // List all collections
    console.log('\n📋 Available collections:');
    const collections = await db.listCollections().toArray();
    collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. ${collection.name}`);
    });
    
    // Check if we have the expected collections
    const expectedCollections = ['leads', 'appointments', 'events', 'staff'];
    console.log('\n🔍 Checking expected collections:');
    for (const collectionName of expectedCollections) {
      const exists = collections.some(c => c.name === collectionName);
      const count = exists ? await db.collection(collectionName).countDocuments() : 0;
      console.log(`   ${collectionName}: ${exists ? '✅' : '❌'} exists, ${count} documents`);
    }
    
    // Try to find any recent records
    console.log('\n🕐 Recent records (last 10 minutes):');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    try {
      const recentLeads = await db.collection('leads').find({
        createdAt: { $gte: tenMinutesAgo }
      }).limit(5).toArray();
      console.log(`   Recent leads: ${recentLeads.length}`);
      
      const recentAppointments = await db.collection('appointments').find({
        createdAt: { $gte: tenMinutesAgo }
      }).limit(5).toArray();
      console.log(`   Recent appointments: ${recentAppointments.length}`);
      
      if (recentLeads.length > 0) {
        console.log('\n📝 Most recent lead:');
        const lead = recentLeads[0];
        console.log(`   ID: ${lead._id}`);
        console.log(`   Name: ${lead.fullName}`);
        console.log(`   Email: ${lead.email}`);
        console.log(`   Created: ${new Date(lead.createdAt).toLocaleString()}`);
        console.log(`   Wants Appointment: ${lead.wantsAppointment}`);
      }
      
      if (recentAppointments.length > 0) {
        console.log('\n📅 Most recent appointment:');
        const apt = recentAppointments[0];
        console.log(`   ID: ${apt._id}`);
        console.log(`   Customer: ${apt.customerName}`);
        console.log(`   Email: ${apt.customerEmail}`);
        console.log(`   Created: ${new Date(apt.createdAt).toLocaleString()}`);
      }
    } catch (findError) {
      console.log(`   Error searching recent records: ${findError.message}`);
    }
    
    // Check connection details
    console.log('\n🔗 Connection Details:');
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Ready State: ${mongoose.connection.readyState}`); // 1 = connected
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    process.exit(0);
  }
}

// Run the debug
if (require.main === module) {
  debugConnection();
}

module.exports = { debugConnection };
