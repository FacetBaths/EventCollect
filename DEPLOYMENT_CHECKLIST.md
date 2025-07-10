# 🚀 EventCollect Deployment Checklist

## Pre-Deployment Setup

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas account
- [ ] Create M0 (free) cluster
- [ ] Create database user (`eventcollect-api`)
- [ ] Set network access to `0.0.0.0/0` or Railway IPs
- [ ] Get connection string
- [ ] Test connection locally

### 2. Environment Variables Preparation
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in MongoDB Atlas connection string
- [ ] Set production LEAP CRM credentials
- [ ] Generate secure JWT secret
- [ ] Configure CORS origins for your domain

### 3. Repository Preparation
- [ ] All code committed to Git
- [ ] `.env` files properly ignored
- [ ] Build scripts working locally
- [ ] Tests passing (if any)

## Railway Deployment

### 4. Railway Account Setup
- [ ] Create Railway account at [railway.app](https://railway.app)
- [ ] Connect GitHub account
- [ ] Install Railway CLI (optional)

### 5. Backend Deployment
- [ ] Create new Railway project
- [ ] Connect to GitHub repository
- [ ] Select `/server` directory as root
- [ ] Configure environment variables in Railway dashboard:
  - [ ] `MONGODB_URI`
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `LEAP_API_URL`
  - [ ] `LEAP_API_TOKEN`
  - [ ] `JWT_SECRET`
  - [ ] `CORS_ORIGINS`
  - [ ] Other required variables

### 6. Database Initialization
- [ ] Deploy backend service
- [ ] Run production setup: `railway run "npm run setup:prod"`
- [ ] Verify database indexes created
- [ ] Test health endpoint

### 7. Frontend Deployment

#### Option A: Railway Frontend
- [ ] Create second Railway service
- [ ] Connect to same GitHub repo
- [ ] Select `/client` directory
- [ ] Set environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `VITE_API_URL=https://your-backend.railway.app/api`

#### Option B: Vercel/Netlify
- [ ] Connect repository to Vercel/Netlify
- [ ] Set build command: `quasar build`
- [ ] Set output directory: `dist/spa`
- [ ] Configure environment variables

## Post-Deployment Testing

### 8. API Testing
- [ ] Health check: `GET /api/health`
- [ ] LEAP sync test: `GET /api/leap-sync/test-connection`
- [ ] Appointments API: `GET /api/appointments/availability/check`
- [ ] CORS headers working
- [ ] Rate limiting active

### 9. Frontend Testing
- [ ] Frontend loads correctly
- [ ] API calls working
- [ ] Staff Calendar displays
- [ ] Lead form submits
- [ ] Appointment scheduling works

### 10. Integration Testing
- [ ] Create test lead
- [ ] Verify LEAP CRM sync
- [ ] Test appointment creation
- [ ] Check MongoDB data persistence
- [ ] Verify appointment notes in LEAP

## Production Monitoring

### 11. Monitoring Setup
- [ ] Railway metrics dashboard
- [ ] MongoDB Atlas monitoring
- [ ] Error logging configured
- [ ] Health check alerts (optional)

### 12. Performance Optimization
- [ ] Database connection pooling
- [ ] Proper indexes created
- [ ] Rate limiting configured
- [ ] Compression enabled

## Security Checklist

### 13. Security Review
- [ ] Environment variables secure
- [ ] No secrets in Git history
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] HTTPS enabled (automatic)
- [ ] Database access restricted

## Maintenance

### 14. Backup Strategy
- [ ] MongoDB Atlas automatic backups (M2+ tier)
- [ ] Code repository backups
- [ ] Environment variables documented
- [ ] Recovery procedures documented

### 15. Update Process
- [ ] GitHub integration for auto-deploy
- [ ] Staging environment (optional)
- [ ] Rollback procedure
- [ ] Database migration strategy

---

## Quick Commands Reference

### Railway CLI Commands
```bash
# Login
railway login

# Deploy
railway up

# View logs
railway logs

# Run commands
railway run "npm run setup:prod"

# Set environment variable
railway variables set MONGODB_URI="your_connection_string"
```

### MongoDB Atlas Connection Test
```bash
# Test connection locally
node -e "const mongoose = require('mongoose'); mongoose.connect('your_connection_string').then(() => console.log('Connected!')).catch(err => console.error('Failed:', err))"
```

### Environment Variables Template
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventcollect
NODE_ENV=production
PORT=3001
LEAP_API_URL=https://your-leap-instance.com/api
LEAP_API_TOKEN=Bearer your_token
JWT_SECRET=your_secure_secret
CORS_ORIGINS=https://your-frontend-domain.com
```

---

## Cost Estimation

- **Railway Starter**: $5/month per service
- **MongoDB Atlas M0**: Free (512MB)
- **Domain** (optional): $10-15/year
- **Total**: $5-10/month + domain

## Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [EventCollect Repository Issues](https://github.com/your-repo/issues)

---

**🎉 Once all items are checked, your EventCollect application should be live and ready for production use!**
