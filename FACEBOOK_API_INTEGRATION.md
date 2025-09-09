# Facebook Lead Ads API Integration Guide

## Overview
This document outlines how to integrate with the Facebook Lead Ads API to automatically fetch leads without manual CSV downloads. This would be the next evolution of the current CSV import functionality.

## Current Implementation
✅ **CSV Import Feature** (Implemented)
- Manual CSV upload via drag-and-drop interface
- Parses Facebook CSV format automatically
- Auto-syncs to LEAP CRM with proper labeling
- Bulk import with error handling and progress tracking

## Future Enhancement: Facebook Lead Ads API

### Prerequisites
1. **Facebook Developer Account**
   - Create a Facebook App at https://developers.facebook.com
   - Get App ID and App Secret

2. **Facebook Business Account**
   - Must have a Facebook Business Manager account
   - Lead ads must be running through Facebook Business Manager

3. **API Permissions**
   - `leads_retrieval` permission (requires Facebook approval)
   - `pages_manage_ads` permission
   - `business_management` permission

### Implementation Approach

#### 1. Authentication Setup
```javascript
// Example OAuth flow for Facebook API
const facebookAuth = {
  appId: process.env.FACEBOOK_APP_ID,
  appSecret: process.env.FACEBOOK_APP_SECRET,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN
};
```

#### 2. API Endpoint Structure
```javascript
// GET leads from Facebook Lead Ads API
// /api/facebook/sync-leads
router.get('/facebook/sync-leads', async (req, res) => {
  // Fetch leads from Facebook API
  // Transform to EventCollect format
  // Import using existing lead creation logic
});
```

#### 3. Webhook Integration (Recommended)
```javascript
// Facebook webhook to receive leads in real-time
// POST /api/facebook/webhook
router.post('/facebook/webhook', (req, res) => {
  // Verify webhook signature
  // Process lead data immediately
  // Auto-sync to LEAP CRM
});
```

### Facebook Lead Ads API Endpoints

#### Get Lead Forms
```
GET https://graph.facebook.com/v18.0/{page-id}/leadgen_forms
```

#### Get Leads from Form
```
GET https://graph.facebook.com/v18.0/{leadgen-form-id}/leads
```

#### Sample Response Format
```json
{
  "data": [
    {
      "id": "lead_id",
      "created_time": "2025-09-09T14:30:00+0000",
      "field_data": [
        {
          "name": "full_name",
          "values": ["Charles Whitby"]
        },
        {
          "name": "email", 
          "values": ["whitbycl@gmail.com"]
        },
        {
          "name": "phone_number",
          "values": ["+14143465082"]
        }
      ]
    }
  ]
}
```

### Integration Benefits
1. **Real-time Lead Import**: Leads imported immediately when generated
2. **No Manual Process**: Eliminates CSV download/upload steps
3. **Reduced Errors**: Direct API integration reduces data handling errors
4. **Better Tracking**: Can track lead source, campaign, and ad set information

### Implementation Timeline
- **Phase 1**: CSV Import (✅ **Complete**)
- **Phase 2**: Facebook API Authentication & Basic Integration
- **Phase 3**: Real-time Webhook Integration
- **Phase 4**: Advanced Campaign/Ad Tracking

### Current CSV Import Testing
To test the implemented CSV import feature:

1. **Navigate to Leads Dashboard** in your browser
2. **Click "Import From CSV"** button (new secondary button)
3. **Upload the Facebook CSV** (`/home/proto/facet/Facebook Leads/FBleads.csv`)
4. **Verify Results**:
   - Leads should import with "Facebook Lead Ad" event
   - Each lead should have referral source as "Facebook"
   - Auto-sync to LEAP CRM should occur
   - Proper phone number formatting
   - Notes include Facebook metadata

### Expected Results from Sample CSV
Based on your sample file, the import should process:
- **11 leads** from the CSV
- All leads tagged with **"Facebook Lead Ad"** event
- Phone numbers normalized (e.g., `+14143465082`)
- Notes include creation date and source info
- LEAP CRM sync with Facebook referral tracking

### Error Handling
The system handles:
- Invalid CSV formats
- Missing required fields
- LEAP sync failures
- File size limits (5MB)
- Duplicate email addresses (allowed)

### Next Steps for API Integration
1. Set up Facebook Developer App
2. Request `leads_retrieval` permission from Facebook
3. Implement OAuth flow for user authorization
4. Create background job to periodically fetch new leads
5. Set up webhook endpoint for real-time processing
