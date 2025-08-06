#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

async function removeEmailUniqueConstraint() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventcollect';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('leads');
    
    // First, let's see what indexes currently exist
    console.log('\n📋 Current indexes on leads collection:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    // Look for email indexes
    const emailIndexes = indexes.filter(index => 
      index.key && (index.key.email || Object.keys(index.key).includes('email'))
    );
    
    if (emailIndexes.length === 0) {
      console.log('ℹ️  No email indexes found. The unique constraint may have already been removed.');
    } else {
      console.log('\n🎯 Found email indexes:', emailIndexes);
      
      for (const emailIndex of emailIndexes) {
        console.log(`\n🗑️  Dropping index: ${emailIndex.name}`);
        try {
          await collection.dropIndex(emailIndex.name);
          console.log(`✅ Successfully dropped index: ${emailIndex.name}`);
        } catch (error) {
          if (error.message.includes('index not found')) {
            console.log(`ℹ️  Index ${emailIndex.name} was already removed`);
          } else {
            console.error(`❌ Error dropping index ${emailIndex.name}:`, error.message);
          }
        }
      }
    }
    
    // Let's also try dropping by pattern (common index names MongoDB creates)
    const commonEmailIndexNames = ['email_1', 'email'];
    
    for (const indexName of commonEmailIndexNames) {
      try {
        console.log(`\n🔍 Attempting to drop index: ${indexName}`);
        await collection.dropIndex(indexName);
        console.log(`✅ Successfully dropped index: ${indexName}`);
      } catch (error) {
        if (error.message.includes('index not found')) {
          console.log(`ℹ️  Index ${indexName} does not exist`);
        } else {
          console.error(`❌ Error dropping index ${indexName}:`, error.message);
        }
      }
    }
    
    // Show final index state
    console.log('\n📋 Final indexes on leads collection:');
    const finalIndexes = await collection.indexes();
    console.log(JSON.stringify(finalIndexes, null, 2));
    
    console.log('\n🎉 Email unique constraint removal process completed!');
    console.log('💡 You should now be able to create leads with duplicate emails.');
    
  } catch (error) {
    console.error('❌ Error removing email unique constraint:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
removeEmailUniqueConstraint();
