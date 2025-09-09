# Facebook CSV Import Testing Guide

## ✅ Feature Implementation Complete

### What Was Built
1. **Backend CSV Processing**
   - `POST /api/leads/import-csv` endpoint
   - CSV parsing utility for Facebook format
   - Automatic LEAP CRM sync with Facebook labeling
   - Error handling and bulk import support

2. **Frontend Upload Interface**
   - Drag-and-drop CSV upload dialog
   - Progress tracking and results display
   - Integration with Leads Dashboard

3. **Facebook-Specific Features**
   - Auto-creates "Facebook Lead Ad" event
   - Proper referral source tracking (`referredBy: 'Facebook'`)
   - Phone number normalization
   - Metadata preservation in notes

## Testing Steps

### 1. Access the Feature
1. Open your EventCollect application in the browser
2. Navigate to **Leads Dashboard** (`/leads`)
3. Look for the new **"Import From CSV"** button (secondary color, upload icon)

### 2. Test CSV Upload
1. Click **"Import From CSV"** button
2. Dialog should open with drag-and-drop area
3. **Option A**: Drag and drop your CSV file: `/home/proto/facet/Facebook Leads/FBleads.csv`
4. **Option B**: Click the upload area to browse and select the file

### 3. Verify File Validation
- ✅ Should accept `.csv` files
- ❌ Should reject non-CSV files with error message
- ❌ Should reject files over 5MB

### 4. Import Process
1. After selecting CSV, click **"Import Leads"**
2. Should show progress bar and status updates:
   - "Uploading file..."
   - "Processing CSV file..."
   - "Import completed!"

### 5. Expected Results
Based on your sample CSV with 11 leads:

#### Success Metrics
- **11 leads imported** (or close to it, depending on data quality)
- **Success notification** showing import results
- **Leads list refreshed** automatically

#### Lead Data Verification
Each imported lead should have:
- ✅ **Name**: From CSV "Name" column (e.g., "Charles Whitby")
- ✅ **Email**: From CSV "Email" column (e.g., "whitbycl@gmail.com")
- ✅ **Phone**: Normalized from CSV "Phone" column (e.g., "+14143465082")
- ✅ **Event Name**: "Facebook Lead Ad"
- ✅ **Referred By**: "Facebook"
- ✅ **Notes**: Include import metadata like creation date and source
- ✅ **LEAP Sync Status**: "synced" or "pending" (depending on LEAP connection)

### 6. LEAP CRM Integration Testing
If LEAP sync is enabled (`ENABLE_LEAP_SYNC=true`):

1. **Check Sync Status**: Each lead should show sync status in the dashboard
2. **LEAP CRM Verification**: 
   - Log into LEAP CRM
   - Check for new prospects/customers
   - Verify referral source is marked as Facebook/Marketing
   - Confirm all lead data transferred correctly

### 7. Error Handling Tests

#### Test Invalid CSV
1. Try uploading a non-CSV file
2. Try uploading an empty file
3. Try uploading a CSV with no valid data
4. Should show appropriate error messages

#### Test Partial Failures
If some leads fail to import:
- Should show mixed results (e.g., "8 successful, 3 failed")
- Should display error details in the results dialog
- Should still import the successful leads

### 8. UI/UX Verification

#### Drag and Drop
- ✅ Visual feedback when dragging files over upload area
- ✅ File information displayed after selection
- ✅ Ability to remove selected file

#### Progress Tracking
- ✅ Progress bar during import
- ✅ Status messages updating
- ✅ Results summary after completion

#### Mobile Responsiveness
- ✅ Dialog works on mobile devices
- ✅ Upload area accessible on touch devices

## Sample Data from Your CSV

Your CSV should import these leads:
1. Charles Whitby - whitbycl@gmail.com - +14143465082
2. Kathryn Payne - 88kathryn55@gmail.com - +13125454134
3. Karen Lennon - Klennon415@gmail.com - +12698234757
4. Nayana Niglye - nniglye@gmail.com - +15163551214
5. Angie Amar - Angiea627@gmail.com - +13149393403
6. ... and 6 more leads

## Troubleshooting

### If Upload Fails
1. **Check file format**: Ensure it's a valid CSV file
2. **Check file size**: Must be under 5MB
3. **Check browser console**: Look for JavaScript errors
4. **Check server logs**: Look for backend processing errors

### If LEAP Sync Fails
1. **Check environment variables**: `ENABLE_LEAP_SYNC` should be `true`
2. **Check LEAP credentials**: API key and company ID must be valid
3. **Check network connectivity**: Server must reach LEAP API
4. **Manual resync**: Use the resync button on failed leads

### Common Issues
- **Phone numbers**: Should be automatically normalized with + prefix
- **Duplicate emails**: Now allowed (email unique constraint removed)
- **Empty fields**: Should use defaults (empty address, no appointment preferences)

## Success Criteria
- ✅ CSV file uploads successfully
- ✅ 11 leads (or close) are imported
- ✅ Leads appear in dashboard with Facebook labeling
- ✅ LEAP sync completes (if enabled)
- ✅ Error handling works for invalid files
- ✅ UI provides good user feedback

## Next Steps After Testing
1. **If successful**: Merge feature branch to main
2. **If issues found**: Create bug reports with details
3. **Future enhancement**: Consider Facebook Lead Ads API integration (see `FACEBOOK_API_INTEGRATION.md`)

---

**Note**: This feature is currently on the `feature/facebook-csv-import` branch. Make sure you've pulled the latest changes and restarted your dev servers if needed.
