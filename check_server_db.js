#!/usr/bin/env node

/**
 * Script to check what database the server is actually using
 * by importing the server's database connection
 */

const path = require('path');

// Add the server src directory to the path
const serverSrcPath = path.join(__dirname, 'server', 'src');

// Set up path for TypeScript compilation
process.env.TS_NODE_PROJECT = path.join(__dirname, 'server', 'tsconfig.json');

// Import the required modules
const { connectToDatabase } = require(path.join(serverSrcPath, 'config', 'database.js'));

async function checkServerDatabase() {
  try {
    console.log('🔍 Checking Server Database Connection');
    console.log('====================================');
    
    // This will use the same connection logic as the server
    const connection = await connectToDatabase();
    
    console.log('✅ Connected using server database logic');
    console.log(`📂 Database: ${connection.connection.name}`);
    console.log(`🌐 Host: ${connection.connection.host}`);
    
    const db = connection.connection.db;
    
    // Check recent records using server connection
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const recentLeads = await db.collection('leads').find({
      createdAt: { $gte: tenMinutesAgo }
    }).limit(10).toArray();
    
    const recentAppointments = await db.collection('appointments').find({
      createdAt: { $gte: tenMinutesAgo }  
    }).limit(10).toArray();
    
    console.log(`\n🕐 Recent records (last 10 minutes):`);
    console.log(`   Recent leads: ${recentLeads.length}`);
    console.log(`   Recent appointments: ${recentAppointments.length}`);
    
    if (recentLeads.length > 0) {
      console.log('\n📝 Recent leads:');
      recentLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. ${lead.fullName} (${lead.email}) - ${new Date(lead.createdAt).toLocaleString()}`);
      });
    }
    
    if (recentAppointments.length > 0) {
      console.log('\n📅 Recent appointments:');
      recentAppointments.forEach((apt, index) => {
        console.log(`   ${index + 1}. ${apt.customerName} (${apt.customerEmail}) - ${new Date(apt.createdAt).toLocaleString()}`);
      });
    }
    
    // Get total counts
    const totalLeads = await db.collection('leads').countDocuments();
    const totalAppointments = await db.collection('appointments').countDocuments();
    
    console.log(`\n📊 Total counts:`);
    console.log(`   Total leads: ${totalLeads}`);
    console.log(`   Total appointments: ${totalAppointments}`);
    
    await connection.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Fallback to direct connection with server env
    console.log('\n🔄 Falling back to direct connection...');
    
    const mongoose = require('mongoose');
    require('dotenv').config({ path: './server/.env' });
    
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected via fallback method');
      
      const db = mongoose.connection.db;
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const recentLeads = await db.collection('leads').find({
        createdAt: { $gte: tenMinutesAgo }
      }).limit(5).toArray();
      
      const recentAppointments = await db.collection('appointments').find({
        createdAt: { $gte: tenMinutesAgo }
      }).limit(5).toArray();
      
      console.log(`\nRecent records via fallback:`);
      console.log(`   Recent leads: ${recentLeads.length}`);
      console.log(`   Recent appointments: ${recentAppointments.length}`);
      
      if (recentLeads.length > 0) {
        console.log('\nRecent leads:');
        recentLeads.forEach((lead, index) => {
          console.log(`   ${index + 1}. ${lead.fullName} - ${new Date(lead.createdAt).toLocaleString()}`);
        });
      }
      
      if (recentAppointments.length > 0) {
        console.log('\nRecent appointments:');
        recentAppointments.forEach((apt, index) => {
          console.log(`   ${index + 1}. ${apt.customerName} - ${new Date(apt.createdAt).toLocaleString()}`);
        });
      }
      
      await mongoose.connection.close();
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
  
  process.exit(0);
}

// Run the check
if (require.main === module) {
  checkServerDatabase();
}

module.exports = { checkServerDatabase };
