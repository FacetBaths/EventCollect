const mongoose = require('mongoose');
require('dotenv').config();

async function setupProduction() {
  try {
    console.log('Starting production database setup...');
    
    // Connect to MongoDB Atlas
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Create indexes for better performance
    console.log('Creating database indexes...');
    
    // Appointments collection indexes
    await db.collection('appointments').createIndex(
      { date: 1, timeSlot: 1 },
      { 
        name: 'date_timeSlot_availability',
        background: true
      }
    );
    
    await db.collection('appointments').createIndex(
      { customerEmail: 1 },
      { 
        name: 'customerEmail_lookup',
        background: true 
      }
    );
    
    await db.collection('appointments').createIndex(
      { status: 1 },
      { 
        name: 'status_filter',
        background: true 
      }
    );
    
    await db.collection('appointments').createIndex(
      { createdAt: -1 },
      { 
        name: 'createdAt_sort',
        background: true 
      }
    );
    
    // Leads collection indexes
    await db.collection('leads').createIndex(
      { email: 1 },
      { 
        name: 'email_unique',
        unique: true,
        background: true 
      }
    );
    
    await db.collection('leads').createIndex(
      { phone: 1 },
      { 
        name: 'phone_lookup',
        background: true 
      }
    );
    
    await db.collection('leads').createIndex(
      { syncStatus: 1 },
      { 
        name: 'syncStatus_filter',
        background: true 
      }
    );
    
    await db.collection('leads').createIndex(
      { leapProspectId: 1 },
      { 
        name: 'leapProspectId_lookup',
        background: true 
      }
    );
    
    await db.collection('leads').createIndex(
      { createdAt: -1 },
      { 
        name: 'createdAt_leads_sort',
        background: true 
      }
    );
    
    console.log('✅ Database indexes created successfully');
    
    // Test collections access
    const appointmentsCount = await db.collection('appointments').countDocuments();
    const leadsCount = await db.collection('leads').countDocuments();
    
    console.log(`📊 Current document counts:`);
    console.log(`   Appointments: ${appointmentsCount}`);
    console.log(`   Leads: ${leadsCount}`);
    
    // Verify environment variables
    console.log('🔍 Environment check:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   PORT: ${process.env.PORT}`);
    console.log(`   Database connected: ${mongoose.connection.readyState === 1 ? '✅' : '❌'}`);
    console.log(`   LEAP integration: ${process.env.LEAP_API_URL ? '✅' : '❌'}`);
    console.log(`   CORS configured: ${process.env.CORS_ORIGINS ? '✅' : '❌'}`);
    
    console.log('🚀 Production database setup completed successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Production setup failed:', error);
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      console.error('   → Duplicate key error - some indexes may already exist');
    } else if (error.name === 'MongoNetworkError') {
      console.error('   → Network error - check MongoDB Atlas network access settings');
      console.error('   → Ensure 0.0.0.0/0 is whitelisted or Railway IPs are allowed');
    } else if (error.message.includes('authentication')) {
      console.error('   → Authentication error - check database username/password');
    }
    
    // Close connection if it was opened
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupProduction();
}

module.exports = setupProduction;
