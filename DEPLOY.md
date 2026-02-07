# TRM Referral Platform - Deployment Guide

This guide will walk you through deploying the TRM Referral Platform on Render.com with all 25 real Myanmar jobs automatically seeded.

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com) (free tier available)
3. **MongoDB Database** - We recommend MongoDB Atlas (free tier available)

---

## Step 1: Prepare MongoDB Database

### Option A: MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (M0 Sandbox is free)
3. In Database Access, create a new database user with password
4. In Network Access, add IP address `0.0.0.0/0` (allows access from anywhere)
5. Go to Clusters → Connect → Connect your application
6. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/trm_referral?retryWrites=true&w=majority
   ```
7. **Save this URI** - you'll need it in Step 3

### Option B: Self-Hosted MongoDB

If you have your own MongoDB instance, ensure it's accessible from the internet and have the connection URI ready.

---

## Step 2: Push Code to GitHub

Ensure your latest code is pushed to GitHub:

```bash
git add .
git commit -m "Production-ready deployment configuration"
git push origin main
```

---

## Step 3: Deploy on Render

### 3.1 Create New Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml` and pre-fill settings

### 3.2 Configure Environment Variables

**IMPORTANT:** You MUST set the MongoDB URI before deploying.

In the Render dashboard for your service:

1. Go to **Environment** tab
2. Add the following environment variable:

| Key | Value | Required |
|-----|-------|----------|
| `MONGODB_URI` | Your MongoDB connection string | **YES** |

**Example:**
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/trm_referral?retryWrites=true&w=majority
```

3. Click **Save Changes**

### 3.3 Deploy

1. Click **"Create Web Service"** or **"Deploy"**
2. Render will:
   - Build the frontend (`npm run build`)
   - Install dependencies
   - Start the server (`npm start`)
   - **Auto-seed 25 real jobs** on first startup

3. Wait for deployment to complete (2-3 minutes)

---

## Step 4: Verify Deployment

### Check Health Endpoint

Once deployed, verify the API is running:

```bash
curl https://your-app-name.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-07T05:55:00.000Z",
  "database": {
    "connected": true
  }
}
```

### Check Jobs Are Seeded

```bash
curl https://your-app-name.onrender.com/api/v1/jobs
```

You should see 25 jobs from real Myanmar companies like:
- RK Yangon Steel
- Universal Energy
- Unicharm Myanmar
- KBZ Life Insurance
- And more...

### Visit Your App

Open `https://your-app-name.onrender.com` in your browser. You should see:
- The TRM Referral Platform homepage
- 25 job listings
- All functionality working

---

## Step 5: Post-Deployment Configuration (Optional)

### Update CORS_ORIGIN and FRONTEND_URL

After your first deploy, Render assigns a unique URL. Update these environment variables:

1. In Render dashboard, go to **Environment** tab
2. Update these values with your actual URL:

| Key | Value |
|-----|-------|
| `CORS_ORIGIN` | `https://your-actual-app-name.onrender.com` |
| `FRONTEND_URL` | `https://your-actual-app-name.onrender.com` |
| `VIBER_WEBHOOK_URL` | `https://your-actual-app-name.onrender.com/api/v1/messaging/viber/webhook` |
| `TELEGRAM_WEBHOOK_URL` | `https://your-actual-app-name.onrender.com/api/v1/messaging/telegram/webhook` |
| `WHATSAPP_WEBHOOK_URL` | `https://your-actual-app-name.onrender.com/api/v1/whatsapp/webhook` |

3. Click **Save Changes** - Render will auto-redeploy

### Custom Domain (Optional)

1. In Render dashboard, go to **Settings** tab
2. Under **Custom Domain**, add your domain
3. Follow DNS configuration instructions
4. Update `CORS_ORIGIN` and `FRONTEND_URL` with your custom domain

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |

### Auto-Configured Variables (Render generates these)

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Main JWT signing key |
| `JWT_ACCESS_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `JWT_EMAIL_SECRET` | Email verification secret |
| `JWT_RESET_SECRET` | Password reset secret |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTO_SEED_ON_STARTUP` | Auto-seed jobs on first start | `true` |
| `LOG_LEVEL` | Logging level | `info` |
| `MESSAGING_MOCK_MODE` | Use mock messaging | `true` |
| `WHATSAPP_MOCK_MODE` | Use mock WhatsApp | `true` |

---

## Troubleshooting

### Build Fails

**Problem:** `npm run build` fails

**Solution:**
1. Check that all dependencies are in `package.json`
2. Ensure `vite` is in `dependencies` (not just `devDependencies`)
3. Check build logs in Render dashboard

### Database Connection Fails

**Problem:** App shows "database connection failed"

**Solution:**
1. Verify `MONGODB_URI` is set correctly in Environment tab
2. Check MongoDB Atlas Network Access - ensure `0.0.0.0/0` is whitelisted
3. Verify database user credentials are correct
4. Check MongoDB Atlas cluster is running (not paused)

### Jobs Not Seeding

**Problem:** No jobs showing in the app

**Solution:**
1. Check logs for seeding messages
2. Verify `AUTO_SEED_ON_STARTUP=true` is set
3. Check database has connection
4. Manually trigger seed: `npm run seed:jobs` (from local with prod DB)

### CORS Errors

**Problem:** Browser shows CORS errors

**Solution:**
1. Update `CORS_ORIGIN` to match your actual domain
2. Include `https://` prefix
3. No trailing slash

### Static Files Not Loading

**Problem:** Frontend shows blank page or 404s

**Solution:**
1. Ensure `dist/` folder exists after build
2. Check Render build logs for build success
3. Verify `npm run build` creates `dist/index.html`

---

## Monitoring & Logs

### View Logs

In Render dashboard:
1. Go to your web service
2. Click **Logs** tab
3. View real-time logs

### Key Log Messages

**Successful startup:**
```
🚀 Server started successfully
📡 Environment: production
🌐 URL: http://0.0.0.0:10000
```

**Auto-seeding:**
```
🔍 Checking if database needs seeding...
🌱 Database is empty. Starting auto-seed...
✅ Auto-seeding completed successfully!
📊 25 jobs are now available
🏢 17 companies registered
```

---

## Scaling (Paid Plans)

To upgrade from free tier:

1. In Render dashboard, go to **Settings** tab
2. Under **Instance Type**, select a paid plan
3. Benefits:
   - More RAM/CPU
   - No sleep after inactivity
   - Faster builds
   - Custom domains with SSL

---

## Backup & Maintenance

### Database Backups

MongoDB Atlas provides automatic backups on paid tiers. For M0 (free):
- Export data periodically using `mongodump`
- Or use MongoDB Atlas Data Lake for backups

### Updating the App

1. Make changes locally
2. Commit and push to GitHub
3. Render auto-deploys (if auto-deploy is enabled)
4. Or manually deploy from Render dashboard

---

## Support

If you encounter issues:

1. Check Render logs first
2. Verify environment variables
3. Test MongoDB connection locally
4. Review this deployment guide

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Deploy | Push to GitHub → Auto-deploy on Render |
| View logs | Render Dashboard → Logs tab |
| Update env vars | Render Dashboard → Environment tab |
| Restart | Render Dashboard → Manual Deploy → Deploy latest commit |
| Check health | `curl https://your-app.onrender.com/api/health` |
| Check jobs | `curl https://your-app.onrender.com/api/v1/jobs` |

---

**Your TRM Referral Platform is now production-ready! 🚀**