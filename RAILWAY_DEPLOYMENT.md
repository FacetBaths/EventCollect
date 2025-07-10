# Railway Deployment Guide

## Prerequisites

1. ✅ MongoDB Atlas cluster created (see MONGODB_ATLAS_SETUP.md)
2. ✅ Git repository with latest code
3. ✅ Railway account (sign up at [railway.app](https://railway.app))

## 1. Setup Railway Project

### Option A: Deploy from GitHub (Recommended)

1. **Connect GitHub**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your EventCollect repository

2. **Configure Service**:
   - Railway will detect the Node.js server
   - Choose the `/server` directory as the root
   - Railway will automatically use the detected `package.json`

### Option B: Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**:
   ```bash
   cd /path/to/EventCollect/server
   railway login
   railway init
   railway up
   ```

## 2. Environment Variables Configuration

Add these environment variables in Railway dashboard:

### Required Variables

```bash
# Database
MONGODB_URI=mongodb+srv://eventcollect-api:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/eventcollect?retryWrites=true&w=majority

# Server
NODE_ENV=production
PORT=3001

# LEAP CRM (replace with your actual values)
LEAP_API_URL=https://your-leap-instance.leapcrm.com/api
LEAP_API_TOKEN=Bearer your_leap_api_token_here

# Security
JWT_SECRET=your_secure_jwt_secret_here
BCRYPT_ROUNDS=12

# CORS (update with your domain)
CORS_ORIGINS=https://your-frontend-domain.com,https://your-domain.com
ENABLE_CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
ENABLE_MORGAN_LOGGING=true
LOG_LEVEL=info
```

### Optional Variables

```bash
# Body Parser
BODY_LIMIT=10mb
URL_LIMIT=10mb

# Feature Flags
ENABLE_APPOINTMENT_SYNC=true
ENABLE_LEAP_INTEGRATION=true
ENABLE_EMAIL_NOTIFICATIONS=false

# Development
MOCK_LEAP_API=false
SKIP_EMAIL_SENDING=true
```

## 3. Domain Configuration

### Custom Domain (Optional)

1. **Add Domain**:
   - Go to your Railway project
   - Click "Settings" → "Domains"
   - Add your custom domain
   - Update DNS records as instructed

2. **SSL Certificate**:
   - Railway automatically provides SSL
   - Certificate auto-renewal included

### Railway Domain

Railway provides a free domain like:
```
https://your-project-name-production.up.railway.app
```

## 4. Frontend Deployment

### Option A: Deploy Frontend to Railway

1. **Create New Service**:
   - In same Railway project, click "New"
   - Select "GitHub Repo" 
   - Choose your repository again
   - Select `/client` directory

2. **Frontend Environment Variables**:
   ```bash
   NODE_ENV=production
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```

### Option B: Deploy Frontend to Vercel/Netlify

1. **Environment Variables**:
   ```bash
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```

## 5. Build Configuration

### Server Build Settings (if needed)

Railway should auto-detect, but you can specify:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

### Frontend Build Settings

For Quasar frontend:
```json
{
  "scripts": {
    "build": "quasar build",
    "start": "quasar serve dist/spa --port $PORT --host 0.0.0.0"
  }
}
```

## 6. Database Migration/Seeding

### Initial Setup Script

Create `scripts/setup-production.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

async function setupProduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
    
    // Create indexes
    await mongoose.connection.db.collection('appointments').createIndex({ date: 1, timeSlot: 1 });
    await mongoose.connection.db.collection('leads').createIndex({ email: 1 });
    
    console.log('Database setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupProduction();
```

Run once after deployment:
```bash
railway run node scripts/setup-production.js
```

## 7. Monitoring & Logs

### Railway Dashboard

1. **Deployment Logs**:
   - View build and runtime logs
   - Real-time log streaming

2. **Metrics**:
   - CPU usage
   - Memory usage
   - Response times

3. **Health Checks**:
   - Automatic health monitoring
   - Restart on failure

### Custom Health Endpoint

Your app already has `/api/health`:

```javascript
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EventCollect API Server is running!',
    timestamp: new Date().toISOString()
  });
});
```

## 8. Scaling & Performance

### Railway Scaling

1. **Automatic Scaling**:
   - Railway handles basic scaling
   - Pay-per-use pricing

2. **Resource Limits**:
   - Starter: 512MB RAM, 1 vCPU
   - Pro: Up to 8GB RAM, 8 vCPU

### Database Scaling

1. **MongoDB Atlas**:
   - Start with M0 (free)
   - Upgrade to M2/M5 for production
   - Auto-scaling available

## 9. Security Checklist

- ✅ Environment variables secure
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ MongoDB network access restricted
- ✅ HTTPS enabled (automatic)
- ✅ API tokens regenerated

## 10. Deployment Commands

### Initial Deployment

```bash
# Make sure you're in the server directory
cd server

# Deploy to Railway
railway up

# Set environment variables (do this in Railway dashboard)
# railway variables set MONGODB_URI="your_connection_string"
```

### Updates

```bash
# Push to GitHub (if using GitHub integration)
git push origin main

# Or deploy directly
railway up
```

## 11. Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify dependencies in package.json
   - Check build logs in Railway dashboard

2. **Database Connection**:
   - Verify MongoDB Atlas network access
   - Check connection string format
   - Ensure database user has correct permissions

3. **Environment Variables**:
   - Double-check all required variables are set
   - Verify no typos in variable names
   - Check for special characters in values

4. **CORS Issues**:
   - Update CORS_ORIGINS with correct frontend URL
   - Check preflight request handling

### Useful Commands

```bash
# View logs
railway logs

# Connect to shell
railway shell

# Run commands
railway run "npm run setup"

# Check status
railway status
```

## 12. Cost Estimation

### Railway Pricing

- **Starter**: $5/month per service
- **Pro**: $20/month per service
- **Usage-based**: Additional compute usage

### MongoDB Atlas

- **M0**: Free (512 MB storage)
- **M2**: ~$9/month
- **M5**: ~$25/month

**Total estimated cost**: $5-30/month depending on usage.

## Next Steps

1. Set up MongoDB Atlas
2. Create Railway account
3. Deploy backend service
4. Configure environment variables
5. Test API endpoints
6. Deploy frontend
7. Update frontend API URLs
8. Test full application
