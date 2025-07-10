# MongoDB Atlas Setup Guide

## 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new organization (if needed)

## 2. Create a New Cluster

1. Click "Create a New Cluster"
2. Choose **M0 Sandbox (Free)**
3. Select a cloud provider and region (AWS/Google/Azure)
4. Name your cluster (e.g., "eventcollect-prod")
5. Click "Create Cluster"

## 3. Database Configuration

1. **Database Access**:
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `eventcollect-api`
   - Generate a secure password (save this!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

2. **Network Access**:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Choose "Allow access from anywhere" (0.0.0.0/0)
   - Or add specific Railway IP ranges if preferred
   - Click "Confirm"

## 4. Get Connection String

1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string (looks like):
   ```
   mongodb+srv://eventcollect-api:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## 5. Database Setup

1. Replace `<password>` with your actual database password
2. Add database name to the end: `/eventcollect`
3. Final connection string:
   ```
   mongodb+srv://eventcollect-api:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/eventcollect?retryWrites=true&w=majority
   ```

## 6. Environment Variables for Railway

Add these to your Railway environment variables:

```bash
MONGODB_URI=mongodb+srv://eventcollect-api:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/eventcollect?retryWrites=true&w=majority
NODE_ENV=production
PORT=3001
```

## 7. Optional: Database Monitoring

1. Go to "Monitoring" to view database performance
2. Set up alerts for high usage
3. Monitor connection limits (500 connections for M0)

## 8. Backup & Security

1. **Automatic Backups**: Enabled by default on M2+ (not M0)
2. **Encryption**: Enabled by default
3. **VPC Peering**: Available for paid tiers
4. **Private Endpoints**: Available for paid tiers

## Production Recommendations

For production workloads, consider upgrading to:
- **M2/M5**: Better performance and backup
- **Dedicated clusters**: Enhanced security
- **Multi-region**: High availability

## Troubleshooting

- **Connection Issues**: Check Network Access whitelist
- **Authentication**: Verify username/password
- **Database Name**: Ensure database name is in connection string
- **Connection Limits**: M0 has 500 connection limit
