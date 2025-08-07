# 🧪 EventCollect v1.2.0 Comprehensive Testing Guide

This document outlines the comprehensive testing approach for all the fixes and features implemented in EventCollect v1.2.0.

## 🎯 Issues Addressed

1. **LEAP CRM Duplicate Creation on Lead Edits** ❌ → ✅
2. **Copy Lead Function Missing from LeadForm** ❌ → ✅  
3. **Appointment Editing in Lead Modal** ❌ → ✅
4. **Appointment Data Not Saving to MongoDB** ❌ → ✅
5. **Email Unique Constraint Issues** ❌ → ✅

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB running (local or Atlas)
- EventCollect server running on port 3000

### Run Tests

**Option 1: Using the shell script (recommended)**
```bash
./run-tests.sh
```

**Option 2: Using npm script**
```bash
cd server
npm run test:comprehensive
```

**Option 3: Direct execution**
```bash
cd server
node scripts/comprehensive-test.js
```

## 🔍 Backend Tests Included

### 1. Email Unique Constraint Removal Test
- ✅ Verifies no unique indexes exist on email field
- ✅ Tests that duplicate emails can be created successfully
- ✅ Cleans up test data automatically

### 2. Appointment Saving to MongoDB Test
- ✅ Verifies 'appointments' collection exists
- ✅ Checks appointment document structure
- ✅ Validates required fields are present

### 3. API Health Check
- ✅ Tests basic API connectivity
- ✅ Verifies API returns successful responses
- ✅ Ensures server is properly configured

### 4. Lead Creation with Appointment Test
- ✅ Creates lead with appointment preferences
- ✅ Verifies appointment details are saved
- ✅ Checks if separate appointment record is created
- ✅ Auto-cleanup of test data

### 5. Lead Update Anti-Duplicate Test
- ✅ Creates a lead, then updates it
- ✅ Verifies no LEAP duplicates are created
- ✅ Tests temperature rating updates
- ✅ Tests appointment detail updates
- ✅ Validates sync status is not 'error' due to duplicates

### 6. Duplicate Email Allowed Test
- ✅ Creates two leads with identical email addresses
- ✅ Verifies both are saved successfully
- ✅ Confirms no unique constraint violations

## 🎨 Frontend Testing Instructions

The test script automatically generates frontend testing instructions. These must be tested manually:

### 1. Copy Lead Function on Lead Form
- [ ] Navigate to Lead Form (/)
- [ ] Fill out form with test data
- [ ] Click "Copy Lead Info" button BEFORE submitting
- [ ] Verify data is copied to clipboard
- [ ] Submit form and verify success
- [ ] Click "Copy Lead Info" button AFTER success
- [ ] Verify saved lead data is copied

### 2. Version Display
- [ ] Check header shows "v1.2.0" below EventCollect title
- [ ] Verify version is hidden on very small screens

### 3. Appointment Editing in Lead Modal
- [ ] Go to Leads Dashboard (/leads)
- [ ] Find/create a lead with appointment preferences
- [ ] Click "Edit" on the lead
- [ ] Verify "Appointment Preferences" section appears
- [ ] Test toggling "Wants Appointment" on/off
- [ ] Test date picker functionality
- [ ] Test time slot selection (10:00 AM, 2:00 PM, 5:00 PM)
- [ ] Test appointment notes editing
- [ ] Save changes and verify persistence

### 4. LEAP Duplicate Prevention
- [ ] Create a lead and let it sync to LEAP
- [ ] Edit the lead (change temp, notes, appointment)
- [ ] Save changes
- [ ] Verify NO duplicates in LEAP CRM
- [ ] Verify sync status is 'synced' or appropriate (not error)

### 5. Duplicate Email Allowed
- [ ] Create lead with email: test@example.com
- [ ] Create another lead with same email
- [ ] Verify both save without errors

### 6. Appointments in Database
- [ ] Create leads with appointment preferences
- [ ] Use MongoDB Compass to verify appointments collection
- [ ] Confirm appointment records have proper structure

## 📊 Test Results Format

The test script provides colorized output with:
- ✅ **Green**: Passed tests
- ❌ **Red**: Failed tests
- ⚠️ **Yellow**: Warnings
- ℹ️ **Blue**: Informational messages

### Sample Output
```
================================================================================
🧪 EVENTCOLLECT v1.2.0 COMPREHENSIVE TEST SUITE
================================================================================

[2025-01-06T23:51:15.000Z] ℹ️  Running test: Email Unique Constraint Removal
[2025-01-06T23:51:15.100Z] ✅ Test passed: Email Unique Constraint Removal

📊 TEST RESULTS
================================================================================
✅ PASSED - Email Unique Constraint Removal
✅ PASSED - Appointment Saving to MongoDB  
✅ PASSED - API Health Check
✅ PASSED - Duplicate Email Allowed
✅ PASSED - Lead Creation with Appointment
✅ PASSED - Lead Update (No Duplicates)

----------------------------------------
📈 Total Tests: 6
✅ Passed: 6
❌ Failed: 0
📊 Success Rate: 100.0%
```

## 🐛 Troubleshooting

### Common Issues

**Server Not Running**
```bash
❌ Server is not running. Please start the server first:
   cd server && npm run dev
```
→ Start the development server before running tests

**MongoDB Connection Failed**
```bash
❌ Failed to connect to MongoDB
```
→ Check MONGODB_URI in your .env file
→ Ensure MongoDB is running (local or Atlas accessible)

**LEAP Sync Errors**
```bash
⚠️  Lead updated successfully. Sync status: error
```
→ This may be expected if LEAP_SYNC is disabled in development
→ Check ENABLE_LEAP_SYNC environment variable

**Test Data Cleanup Issues**
```bash
❌ Failed to clean up test data
```
→ Tests attempt automatic cleanup but may leave test data
→ Manually clean test leads with emails starting with 'test-'

## 🔧 Configuration

### Environment Variables
The test script respects these environment variables:

```bash
# API Base URL (default: http://localhost:3000/api)
API_BASE_URL=http://localhost:3000/api

# MongoDB Connection (default: mongodb://localhost:27017/eventcollect)
MONGODB_URI=mongodb://localhost:27017/eventcollect

# LEAP Sync (for testing LEAP integration)
ENABLE_LEAP_SYNC=false
```

### Test Data Patterns
All test data uses recognizable patterns for easy identification:
- Email: `test-{type}-{timestamp}@example.com`
- Names: `Test {Type} User`
- Notes: `Test lead for {purpose}`

## 📝 Adding New Tests

To add new tests to the comprehensive suite:

1. Add a new test method to the `ComprehensiveTest` class
2. Follow the naming convention: `testYourNewFeature()`
3. Use the class's `log()` method for consistent output
4. Include proper error handling and cleanup
5. Add the test to the `runAllTests()` method

Example:
```javascript
async testYourNewFeature() {
  // Test implementation
  if (someCondition) {
    throw new Error('Test failed: reason');
  }
  this.log('✅ Your new feature works correctly', 'success');
}
```

## 🎉 Success Criteria

All tests passing (100% success rate) indicates:
- ✅ LEAP duplicate issue is resolved
- ✅ Email constraints are properly removed  
- ✅ Appointments save to MongoDB correctly
- ✅ API is healthy and responsive
- ✅ All major functionality works as expected

The system is ready for production deployment when all backend tests pass and frontend manual tests are confirmed.
