# Frontend Deployment Guide

## 🎯 **Deployment Architecture**

- **Backend (Railway)**: Your Node.js API server 
- **Frontend (Vercel/Netlify)**: Your Quasar/Vue.js client app
- **Database**: MongoDB Atlas (connected to Railway backend)

## 🚀 **Recommended: Deploy Frontend to Vercel**

### **Step 1: Update API Configuration**

Update `/client/src/services/api.ts` to use production backend URL:

```typescript
// Replace this line:
const API_BASE_URL = '/api';

// With this (after Railway deployment):
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-railway-service.railway.app/api'
  : '/api';
```

### **Step 2: Create Production Environment File**

Create `/client/.env.production`:
```env
VITE_API_BASE_URL=https://your-railway-service.railway.app/api
VITE_APP_NAME=EventCollect
VITE_APP_VERSION=1.0.0
```

### **Step 3: Update API Service**

Update the API configuration to use environment variables:

```typescript
// In api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
```

### **Step 4: Deploy to Vercel**

1. **Push client to separate repository** (or use monorepo)
2. **Connect Vercel to your GitHub**
3. **Set build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `client` (if monorepo)

### **Step 5: Configure CORS on Railway**

Update your Railway environment variables:
```
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:9000
```

## 🔧 **Alternative: Deploy Frontend to Netlify**

1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-railway-service.railway.app/api
   ```

## 📁 **Monorepo vs Separate Repos**

### **Option 1: Keep Monorepo**
- Deploy backend from `/server` directory to Railway
- Deploy frontend from `/client` directory to Vercel
- Both use same GitHub repository

### **Option 2: Split into Separate Repos**
- Create `eventcollect-backend` repository
- Create `eventcollect-frontend` repository
- Easier to manage separate deployments

## 🔗 **Final Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Database      │
│   (Vercel)      │◄──►│   (Railway)      │◄──►│ (MongoDB Atlas) │
│   Vue.js/Quasar │    │   Node.js/Express│    │   Managed       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
       │                        │
       │                        │
   Users access              API endpoints
   your web app              /api/leads
                            /api/appointments
                            /api/health
```

## 📋 **Deployment Checklist**

### **Backend (Railway) ✅**
- [x] Deploy server to Railway
- [x] Set environment variables
- [x] Test API endpoints

### **Frontend (Next)**
- [ ] Update API base URL for production
- [ ] Deploy to Vercel/Netlify
- [ ] Update CORS settings on Railway
- [ ] Test end-to-end functionality

## 🎯 **Once Railway Backend is Working**

1. Get your Railway service URL: `https://your-service.railway.app`
2. Update frontend API configuration
3. Deploy frontend to Vercel
4. Update CORS settings
5. Test the complete application

**Your users will access the frontend URL, which will make API calls to the Railway backend!**
