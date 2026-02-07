# Railway Deployment Guide for MyanJobs

Complete deployment guide for deploying the MyanJobs Referral Platform on Railway, including fixes for common database connection issues.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Configuration](#database-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Alternative: MongoDB Atlas](#alternative-mongodb-atlas)
9. [Alternative: Render.com](#alternative-rendercom)

---

## Overview

Railway is a platform that simplifies deploying applications with managed databases. This guide covers deploying MyanJobs with proper database connection handling and health checks.

### Architecture on Railway

```
┌─────────────────────────────────────────────────────────────┐
│                        Railway Platform                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MyanJobs Application Service              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │   API       │  │  Frontend   │  │  Worker     │   │  │
│  │  │   Server    │  │  (Built)    │  │  Processes  │   │  │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘   │  │
│  └─────────┼─────────────────────────────────────────────┘  │
│            │                                                 │
│  ┌─────────▼──────────┐  ┌───────────────────────────────┐  │
│  │  MongoDB Plugin    │  │  Redis Plugin (Optional)      │  │
│  │  (or External)     │  │  (for caching/sessions)       │  │
│  └────────────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- [Railway account](https://railway.app/)
- [GitHub account](https://github.com/) (for repository connection)
- MongoDB database (Railway plugin or external like MongoDB Atlas)

---

## Quick Start

### Option 1: Deploy from GitHub (Recommended)

1. Fork the MyanJobs repository to your GitHub account
2. Log in to [Railway Dashboard](https://railway.app/dashboard)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select the MyanJobs repository
5. Railway will auto-detect the `railway.json` configuration
6. Add environment variables (see [Environment Variables](#environment-variables))
7. Deploy!

### Option 2: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your MyanJobs repository

### Step 2: Add MongoDB Database

#### Option A: Railway MongoDB Plugin (Easiest)

1. In your Railway project, click "New"
2. Select "Database" → "Add MongoDB"
3. Railway automatically creates a MongoDB instance and sets `MONGO_URL`

#### Option B: MongoDB Atlas (Recommended for Production)

See [Alternative: MongoDB Atlas](#alternative-mongodb-atlas) section below.

### Step 3: Configure Environment Variables

Go to your service → "Variables" tab and add the following:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | Internal port (Railway maps to external) |
| `MONGODB_URI` | `${{MongoDB.MONGO_URL}}` | Auto-populated if using Railway MongoDB |
| `JWT_ACCESS_SECRET` | Generate strong secret | For JWT tokens |
| `JWT_REFRESH_SECRET` | Generate strong secret | For refresh tokens |
| `FRONTEND_URL` | `https://your-app.up.railway.app` | Your Railway domain |

#### Generating Secrets

```bash
# Generate secure JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Configure Domains

1. Go to your service → "Settings" → "Domains"
2. Railway provides a default `*.up.railway.app` domain
3. (Optional) Add custom domain:
   - Click "Generate Domain" or "Custom Domain"
   - Follow DNS configuration instructions

### Step 5: Deploy

1. Railway auto-deploys on git push
2. Or manually deploy: Click "Deploy" in the dashboard
3. Monitor logs: Service → "Deployments" → "View Logs"

---

## Environment Variables

### Complete Environment Variables for Railway

Create a `.env.railway` file for reference:

```env
# ============================================
# Railway-Specific Configuration
# ============================================
NODE_ENV=production
PORT=3000
RAILWAY_ENVIRONMENT=true

# ============================================
# Database (Railway MongoDB Plugin)
# ============================================
# This is auto-populated by Railway when using the MongoDB plugin
MONGODB_URI=${{MongoDB.MONGO_URL}}
# Or if using external MongoDB:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/myanjobs?retryWrites=true&w=majority

# Database connection retry settings (Railway-specific)
MONGODB_RETRY_ATTEMPTS=5
MONGODB_RETRY_DELAY=3000
MONGODB_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000

# ============================================
# Redis (Optional - for caching/sessions)
# ============================================
# If using Railway Redis plugin:
REDIS_URL=${{Redis.REDIS_URL}}
# Or disable Redis if not available:
# REDIS_ENABLED=false

# ============================================
# JWT Configuration
# ============================================
JWT_ACCESS_SECRET=your-super-secret-access-key-min-64-chars-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-64-chars-long
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_EMAIL_SECRET=your-email-verification-secret
JWT_RESET_SECRET=your-password-reset-secret

# ============================================
# CORS & Frontend
# ============================================
CORS_ORIGIN=https://your-app.up.railway.app
FRONTEND_URL=https://your-app.up.railway.app

# ============================================
# File Upload
# ============================================
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# ============================================
# Myanmar Payment Gateways (Optional)
# ============================================
# KBZ Pay
KBZPAY_MERCHANT_ID=your-kbz-merchant-id
KBZPAY_API_KEY=your-kbz-api-key
KBZPAY_API_SECRET=your-kbz-api-secret
KBZPAY_WEBHOOK_SECRET=your-kbz-webhook-secret
KBZPAY_API_URL=https://api.kbzpay.com/payment/gateway
KBZPAY_CALLBACK_URL=https://your-app.up.railway.app/api/payments/callback/kbz_pay

# Wave Pay
WAVEPAY_MERCHANT_ID=your-wave-merchant-id
WAVEPAY_API_KEY=your-wave-api-key
WAVEPAY_API_SECRET=your-wave-api-secret
WAVEPAY_WEBHOOK_SECRET=your-wave-webhook-secret
WAVEPAY_API_URL=https://payments.wavemoney.io
WAVEPAY_CALLBACK_URL=https://your-app.up.railway.app/api/payments/callback/wave_pay

# AYA Pay
AYAPAY_MERCHANT_ID=your-aya-merchant-id
AYAPAY_API_KEY=your-aya-api-key
AYAPAY_API_SECRET=your-aya-api-secret
AYAPAY_WEBHOOK_SECRET=your-aya-webhook-secret
AYAPAY_API_URL=https://api.ayapay.com/v1
AYAPAY_CALLBACK_URL=https://your-app.up.railway.app/api/payments/callback/aya_pay

# ============================================
# Email (SendGrid Recommended for Railway)
# ============================================
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=MyanJobs

# ============================================
# SMS (Twilio)
# ============================================
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# ============================================
# Cloud Storage (AWS S3)
# ============================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your-s3-bucket-name

# ============================================
# AI Services
# ============================================
MOONSHOT_API_KEY=your-moonshot-api-key

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# Logging
# ============================================
LOG_LEVEL=info
```

---

## Database Configuration

### Railway MongoDB Plugin Connection

When using Railway's MongoDB plugin, the `MONGO_URL` is automatically injected:

```javascript
// server/config/database.js automatically handles this
const mongoUri = process.env.MONGODB_URI || 
                 process.env.MONGO_URL || 
                 process.env.DATABASE_URL;
```

### Connection Retry Logic

The enhanced database configuration includes automatic retry with exponential backoff:

```javascript
// Retries up to 5 times with delays: 3s, 6s, 12s, 24s, 30s
const RETRY_CONFIG = {
  maxRetries: 5,
  retryDelay: 3000,
  maxRetryDelay: 30000,
};
```

### Health Check Endpoint

Railway uses the health check endpoint to verify service status:

```
GET /api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "database": {
    "connected": true,
    "stats": {
      "host": "mongodb.railway.internal",
      "port": 27017,
      "name": "myanjobs"
    }
  }
}
```

---

## Troubleshooting

### Issue 1: Database Connection Failed

**Symptoms:**
- Logs show "MongoDB Connection Error"
- Service crashes on startup
- Health check fails

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # In Railway dashboard, verify MONGODB_URI is set
   # Should look like: mongodb://mongo:password@mongodb.railway.internal:27017/myanjobs
   ```

2. **Verify MongoDB Plugin:**
   - Go to Project → MongoDB service
   - Check if MongoDB is running
   - Check connection string in "Connect" tab

3. **Test Connection Locally:**
   ```bash
   # Install MongoDB shell
   mongosh "your-railway-mongodb-uri"
   ```

4. **Check Network Access:**
   - Ensure no IP whitelist blocking Railway
   - Verify MongoDB user has correct permissions

### Issue 2: Service Crashes After Deploy

**Symptoms:**
- Deployment shows "Crashed" status
- Logs show errors

**Solutions:**

1. **Check Logs:**
   ```bash
   railway logs
   ```

2. **Verify Build:**
   - Check if `npm run build` succeeds
   - Check Dockerfile syntax

3. **Memory Issues:**
   - Railway free tier has memory limits
   - Reduce `MONGODB_POOL_SIZE` to 5
   - Disable unnecessary services

### Issue 3: Health Check Failures

**Symptoms:**
- Railway shows "Unhealthy" status
- Service keeps restarting

**Solutions:**

1. **Verify Health Endpoint:**
   ```bash
   curl https://your-app.up.railway.app/api/health
   ```

2. **Check Response Time:**
   - Health check timeout is 30 seconds
   - Database connection should complete within this time

3. **Update railway.json:**
   ```json
   {
     "deploy": {
       "healthcheckPath": "/api/health",
       "healthcheckTimeout": 30,
       "healthcheckInterval": 10
     }
   }
   ```

### Issue 4: CORS Errors

**Symptoms:**
- Frontend can't connect to API
- Browser shows CORS errors

**Solutions:**

1. **Update CORS_ORIGIN:**
   ```env
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

2. **Allow Multiple Origins:**
   ```env
   CORS_ORIGIN=https://your-app.up.railway.app,https://your-custom-domain.com
   ```

### Issue 5: Environment Variables Not Loading

**Symptoms:**
- App uses default values
- Secrets exposed in logs

**Solutions:**

1. **Verify Variable Names:**
   - Check spelling matches exactly
   - Case-sensitive

2. **Use Railway Variable Syntax:**
   ```
   ${{MongoDB.MONGO_URL}}
   ```

3. **Redeploy After Changes:**
   - Environment variables require redeployment

---

## Alternative: MongoDB Atlas

If Railway's MongoDB plugin has issues, use MongoDB Atlas:

### Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free tier cluster (M0)
3. Choose AWS region closest to Railway (us-east-1 recommended)

### Step 2: Configure Network Access

1. In Atlas → Network Access → IP Access List
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
   - Railway IPs change dynamically
   - Use VPC peering for production (paid feature)

### Step 3: Create Database User

1. Database Access → Add New Database User
2. Choose "Password" authentication
3. Generate secure password
4. Grant "Read and Write" permissions

### Step 4: Get Connection String

1. Clusters → Connect → Connect your application
2. Copy connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/myanjobs?retryWrites=true&w=majority
   ```

### Step 5: Add to Railway

1. Go to Railway → Your Service → Variables
2. Add:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/myanjobs?retryWrites=true&w=majority
   ```

### MongoDB Atlas vs Railway MongoDB

| Feature | Railway MongoDB | MongoDB Atlas |
|---------|----------------|---------------|
| Setup | Automatic | Manual |
| Cost | Included | Free tier available |
| Backups | Manual | Automated |
| Monitoring | Basic | Advanced |
| Scaling | Vertical | Horizontal |
| Network | Internal | Internet |

---

## Alternative: Render.com

If Railway continues to have issues, use Render.com:

### Step 1: Create Render Account

1. Go to [Render](https://render.com/)
2. Sign up with GitHub

### Step 2: Create Web Service

1. Dashboard → New → Web Service
2. Connect GitHub repository
3. Configure:
   - **Name:** myanjobs-api
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Step 3: Add MongoDB

1. New → PostgreSQL (or use MongoDB Atlas)
2. For MongoDB, use [Render MongoDB](https://render.com/docs/mongodb) or Atlas

### Step 4: Environment Variables

Add same variables as Railway in Render Dashboard → Environment

### Render Configuration File

Create `render.yaml`:

```yaml
services:
  - type: web
    name: myanjobs-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        fromDatabase:
          name: myanjobs-mongodb
          property: connectionString
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true

databases:
  - name: myanjobs-mongodb
    databaseName: myanjobs
    user: myanjobs
```

### Railway vs Render

| Feature | Railway | Render |
|---------|---------|--------|
| Free Tier | $5 credit/month | Limited free tier |
| Deploy Speed | Fast | Medium |
| MongoDB | Built-in plugin | External only |
| Custom Domains | Yes | Yes |
| SSL | Automatic | Automatic |
| Logs | Real-time | Real-time |

---

## Monitoring & Maintenance

### Railway Dashboard Monitoring

1. **Metrics Tab:**
   - CPU usage
   - Memory usage
   - Network I/O

2. **Logs Tab:**
   - Real-time application logs
   - Deployment logs

3. **Deployments Tab:**
   - Deployment history
   - Rollback capability

### Setting Up Alerts

1. Go to Project Settings → Notifications
2. Connect Slack/Discord for alerts
3. Configure alert thresholds

### Database Backups

**Railway MongoDB:**
- Manual backups via Railway CLI
- Consider automated backup script

**MongoDB Atlas:**
- Automated daily backups (free tier)
- Point-in-time recovery (paid)

---

## Security Best Practices

1. **Never commit `.env` files**
2. **Use Railway secrets for sensitive data**
3. **Enable 2FA on Railway account**
4. **Regularly rotate JWT secrets**
5. **Use strong MongoDB passwords**
6. **Enable MongoDB Atlas IP whitelist** (if not on Railway)

---

## Support Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Render Documentation](https://render.com/docs)

---

## Quick Reference Commands

```bash
# Railway CLI
railway login          # Login to Railway
railway link           # Link to project
railway up             # Deploy
railway logs           # View logs
railway status         # Check status
railway variables      # List variables

# MongoDB Connection Test
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"

# Health Check
curl https://your-app.up.railway.app/api/health
```

---

## Summary

1. ✅ Use `railway.json` for configuration
2. ✅ Set `MONGODB_URI` environment variable
3. ✅ Use MongoDB Atlas if Railway MongoDB has issues
4. ✅ Enable health checks at `/api/health`
5. ✅ Configure proper CORS origins
6. ✅ Monitor logs for connection errors
7. ✅ Use connection retry logic for stability

For issues, check logs first, then verify environment variables, and consider MongoDB Atlas as a reliable alternative.
