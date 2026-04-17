# Fixing Render Free Tier Sleep Issue

## 📋 Problem Summary

Your Render free tier server goes to sleep after 15 minutes of inactivity. The axios keep-alive script was added but it doesn't work because:

1. **Script isn't scheduled**: `scripts/keep-alive.js` is a standalone file that needs external scheduling
2. **Internal cron won't work**: Even if you add cron inside the app, the app itself sleeps
3. **Only external pings count**: Render only considers pings from OUTSIDE its infrastructure as activity

---

## 🔍 Why Render Spins Down

- Free tier = automatic spin down after 15 minutes of no incoming requests
- **Incoming requests from outside the Render infrastructure = Activity (resets timer)**
- **Internal requests or cron jobs = NOT considered activity (don't reset timer)**
- **Result**: Server sleeps anyway, even with internal keep-alive attempts

---

## ✅ Proper Solutions (in order)

### Solution 1: External Cron Service (RECOMMENDED - Free)

**Best option for free tier. Ping your health endpoint from outside Render.**

#### Step 1: Use cron-job.org
1. Go to https://cron-job.org/en/
2. Sign up (free)
3. Create a new cron job:
   - **URL**: `https://api.quizplay.co.in/health`
   - **Schedule**: Every 10 minutes
   - **Timezone**: Your preferred timezone
   - **Notifications**: Enable (optional)

#### Step 2: Verify it works
- Check Render logs to see pings coming in
- Server will stay awake as long as pings continue

**Why this works**: External pings from cron-job.org infrastructure keep your Render server active.

---

### Solution 2: Uptime Robot (Free Tier - Popular)

1. Go to https://uptimerobot.com (free account)
2. Create a new monitor:
   - **Monitor type**: HTTP(s)
   - **URL**: `https://api.quizplay.co.in/health`
   - **Monitoring interval**: 10 minutes
   - **Alert contacts**: Optional
3. Activate the monitor

**Bonus**: Get uptime reports and alerts

---

### Solution 3: Multiple Services (Redundancy)

Set up multiple external cron services to ensure continuous pings:
- Primary: cron-job.org
- Secondary: Uptime Robot
- Tertiary: EasyCron.com

This provides redundancy - if one service goes down, another keeps your server alive.

---

### Solution 4: Upgrade Render Plan (Paid)

- **Standard tier**: $7/month minimum
- **Includes**: No automatic spin down, better resources
- **Benefit**: Never have to worry about sleep again

---

## 🛠️ What Was Updated

### 1. Enhanced Health Endpoint
**File**: `src/app.controller.ts`

Now returns detailed server information:
```json
{
  "status": "ok",
  "service": "quiz-api-server",
  "timestamp": "2026-04-17T10:30:45.123Z",
  "uptime": {
    "seconds": 1825,
    "formatted": "30m 25s"
  },
  "memory": {
    "heapUsed": 65,
    "heapTotal": 128,
    "unitMB": "MB"
  },
  "nodeVersion": "v18.x.x",
  "environment": "production"
}
```

This helps monitor server health from external services.

### 2. Improved Keep-Alive Script
**File**: `scripts/keep-alive.js`

Enhanced with:
- Detailed logging for debugging
- Better error handling
- Health endpoint prioritization
- Timeout configuration
- Retry logic with exponential backoff

**Note**: This script is for manual testing only. DO NOT rely on it being scheduled within the app.

---

## 🧪 Testing

### Test 1: Manual Script Run
```bash
node scripts/keep-alive.js
```

Expected output:
```
✓ Success: https://api.quizplay.co.in/health (Status: 200)
✓ Keep-alive completed in 0.45s: 1/1 URLs successful
```

### Test 2: Health Endpoint
```bash
curl https://api.quizplay.co.in/health
```

### Test 3: Monitor Render Logs
1. Go to Render dashboard
2. Select your service
3. Click "Logs"
4. Wait for external cron pings to appear (every 10 minutes)

---

## 📊 Recommended Setup

**For Production** (this setup):

| Service | URL | Interval | Purpose |
|---------|-----|----------|---------|
| Primary Cron | https://api.quizplay.co.in/health | Every 10 min | Keep server active |
| Secondary Cron | https://api.quizplay.co.in/health | Every 12 min | Redundancy |
| Status Monitor | https://api.quizplay.co.in/health | Every 5 min | Uptime tracking |

---

## ❌ What Doesn't Work

❌ Internal cron jobs within the app
❌ Scheduled tasks that run within Node.js
❌ WebSocket keep-alives
❌ Background jobs without external trigger
❌ Dependencies on the app's own requests

✅ Only EXTERNAL HTTP requests from outside Render infrastructure prevent sleep

---

## 🔗 Useful Links

- [Render Docs - Sleep Behavior](https://render.com/docs/free#free-tier)
- [cron-job.org Setup](https://cron-job.org/en/)
- [Uptime Robot](https://uptimerobot.com/)
- [EasyCron](https://www.easycron.com/)

---

## 📝 Quick Checklist

- [ ] Set up external cron service (cron-job.org or Uptime Robot)
- [ ] Configure to ping `/health` endpoint every 10 minutes
- [ ] Test by checking Render logs for incoming pings
- [ ] Verify server no longer sleeps after 15 minutes
- [ ] Consider setting up secondary service for redundancy
- [ ] Monitor uptime reports from the external service

---

## 🎯 Next Steps

1. **Immediate**: Set up cron-job.org (takes 5 minutes)
2. **Soon**: Add Uptime Robot for redundancy
3. **Future**: Consider upgrading to Render's paid tier for stability

---

**Status**: ✅ Keep-alive infrastructure ready. Awaiting external cron configuration.
