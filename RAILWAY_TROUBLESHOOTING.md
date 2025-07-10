# Railway Deployment Troubleshooting

## Common Railway Deployment Issues & Solutions

### 🔍 **If Railway Deployment Crashes**

#### 1. **Check Railway Logs**
- Go to Railway Dashboard → Your Service → "Logs" tab
- Look for specific error messages during build or runtime

#### 2. **Environment Variables Issues**
**Most Common Cause**: Missing or incorrect environment variables

**Required Variables (check these first):**
```
MONGODB_URI=mongodb+srv://facet:Fr74108520@cluster0.rx51uk5.mongodb.net/eventcollect?retryWrites=true&w=majority&appName=Cluster0
NODE_ENV=production
PORT=3001
```

**LEAP CRM Variables:**
```
LEAP_API_BASE_URL=https://api.jobprogress.com/api/v3
LEAP_API_TOKEN=[Your JWT token]
```

#### 3. **Build Failures**
If build fails, check:
- Railway is using Node.js 18+ (specified in package.json engines)
- All dependencies in server/package.json are available
- TypeScript compiles without errors

#### 4. **Runtime Crashes**
Common causes:
- **Database Connection**: MongoDB Atlas credentials incorrect
- **Port Issues**: Railway assigns PORT automatically, our app uses process.env.PORT
- **Missing Dependencies**: Some packages not installed properly

### 🛠️ **Fix Attempts Applied**

1. **Updated railway.toml**:
   - Use `npm ci` instead of `npm install` for faster, more reliable builds
   - Direct node command instead of npm start
   - Increased health check timeout to 300 seconds

2. **Added Procfile** (backup deployment method)

3. **Updated root package.json** with Railway-specific scripts

### 🔧 **Manual Debugging Steps**

If still crashing, try these Railway settings:

#### **Option 1: Use Nixpacks with Custom Start**
In Railway Variables tab, add:
```
NIXPACKS_BUILD_CMD=cd server && npm ci && npm run build
NIXPACKS_START_CMD=cd server && node dist/index.js
```

#### **Option 2: Force Procfile Deployment**
In Railway Variables tab, add:
```
DISABLE_NIXPACKS=true
```

#### **Option 3: Check Node Version**
Ensure Railway is using Node 18+:
```
NODE_VERSION=18
```

### 📋 **Essential Environment Variables Checklist**

Copy these exactly into Railway Variables tab:

**Database & Server:**
- ✅ `MONGODB_URI` - Your MongoDB Atlas connection string
- ✅ `NODE_ENV=production`
- ✅ `PORT=3001` (Railway will override this automatically)

**Security:**
- ✅ `JWT_SECRET` - Change to a secure production value
- ✅ `WEBHOOK_SECRET` - Change to a secure production value

**LEAP CRM:**
- ✅ `LEAP_API_BASE_URL=https://api.jobprogress.com/api/v3`
- ✅ `LEAP_API_TOKEN` - Your full JWT token with Bearer prefix

**Email (Optional):**
- ✅ `EMAIL_HOST=mail.privateemail.com`
- ✅ `EMAIL_PORT=587`
- ✅ `EMAIL_USER=info@facetrenovations.us`
- ✅ `EMAIL_PASS=Info74108520`

### 🚀 **Deployment Success Indicators**

When deployment works, you should see:
1. ✅ Build completes successfully
2. ✅ Health check at `/api/health` returns 200
3. ✅ Logs show "EventCollect Server running on port XXXX"
4. ✅ Logs show "MongoDB Connected"

### 📞 **If All Else Fails**

1. **Simple Test**: Deploy with minimal environment variables first (just MONGODB_URI, NODE_ENV, PORT)
2. **Local Test**: Ensure `cd server && node dist/index.js` works locally
3. **Railway Support**: Check Railway Discord or documentation for platform-specific issues

### 🔍 **Debug Commands for Local Testing**

Test the exact Railway deployment process:
```bash
# Test build
cd server && npm ci && npm run build

# Test start
cd server && NODE_ENV=production PORT=3001 node dist/index.js

# Test health endpoint
curl http://localhost:3001/api/health
```
