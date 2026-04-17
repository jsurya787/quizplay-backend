/**
 * External Cron Service Configuration Reference
 * 
 * Use this as a reference when setting up your keep-alive cron jobs
 */

// ============================================================
// SERVICE 1: cron-job.org (Primary)
// ============================================================
// 
// Website: https://cron-job.org/en/
// Plan: Free (no credit card required)
// 
// Configuration:
// {
//   "title": "Quiz API Keep-Alive (Primary)",
//   "url": "https://api.quizplay.co.in/health",
//   "schedule": "Every 10 minutes",
//   "timezone": "Asia/Kolkata",  // or your timezone
//   "notifications": "enabled",
//   "executionTimeout": 15000,  // ms
// }
// 
// Cron Expression: * * * * */10
// Test: After 10 minutes, check Render logs for incoming requests
// 

// ============================================================
// SERVICE 2: Uptime Robot (Secondary - for redundancy)
// ============================================================
//
// Website: https://uptimerobot.com/
// Plan: Free (basic monitoring included)
//
// Configuration:
// {
//   "monitorName": "Quiz API Keep-Alive (Secondary)",
//   "monitorType": "HTTP(s)",
//   "url": "https://api.quizplay.co.in/health",
//   "monitoringInterval": 10,  // minutes
//   "alertContacts": [],  // optional
//   "timezone": "Asia/Kolkata"
// }
//
// Benefits:
// - Uptime statistics/reports
// - Status page integration
// - Alert notifications
// - Logs all ping times
//

// ============================================================
// SERVICE 3: EasyCron (Optional tertiary service)
// ============================================================
//
// Website: https://www.easycron.com/
// Plan: Free (with limitations)
//
// Configuration:
// {
//   "cronExpression": "*/10 * * * *",  // every 10 minutes
//   "url": "https://api.quizplay.co.in/health",
//   "notifyEmail": "your-email@example.com",
//   "timeout": 15,  // seconds
// }
//

// ============================================================
// TESTING & VERIFICATION
// ============================================================

// After setting up cron jobs, verify:

// 1. Test health endpoint directly:
// curl https://api.quizplay.co.in/health | jq .

// 2. Check Render Logs:
// - Go to: https://dashboard.render.com
// - Select your service
// - Click "Logs"
// - Wait 10 minutes
// - Should see incoming GET /health requests

// 3. Verify Response Structure:
// {
//   "status": "ok",
//   "service": "quiz-api-server",
//   "timestamp": "2026-04-17T10:30:45.123Z",
//   "uptime": {
//     "seconds": 1825,
//     "formatted": "30m 25s"
//   },
//   "memory": {
//     "heapUsed": 65,
//     "heapTotal": 128,
//     "unitMB": "MB"
//   },
//   "nodeVersion": "v18.x.x",
//   "environment": "production"
// }

// ============================================================
// TROUBLESHOOTING
// ============================================================

// If server still sleeps:
// 1. Verify cron jobs are ENABLED in the service
// 2. Check Render logs - do you see incoming requests?
// 3. Wait at least 20 minutes for first ping
// 4. Verify URL is correct: https://api.quizplay.co.in/health
// 5. Check cron service logs for execution status

// If cron service says "Connection Refused":
// 1. Verify server is running (not already sleeping)
// 2. Check Render deployment - recent successful build?
// 3. Verify domain DNS is configured correctly
// 4. Try manually: curl https://api.quizplay.co.in/health

// ============================================================
// MONITORING CHECKLIST
// ============================================================

// After setup, monitor these indicators:

// ✅ Healthy State:
// □ Render logs show GET /health requests every 10 minutes
// □ Health endpoint returns 200 status
// □ Response includes uptime info
// □ No server spin-down messages in logs
// □ Uptime Robot shows 100% availability

// ❌ Problem Indicators:
// □ No GET /health requests in Render logs
// □ Health endpoint returns 503
// □ Render shows "Service spun down" message
// □ Cron service shows failed executions
// □ Uptime Robot shows downtime periods

// ============================================================
// RECOMMENDED SETUP
// ============================================================

// For production reliability, use ALL THREE:
// 1. cron-job.org (primary) - Every 10 minutes
// 2. Uptime Robot (secondary) - Every 10 minutes  
// 3. EasyCron (tertiary) - Every 10 minutes

// This ensures:
// - If one service has maintenance, others keep server alive
// - Multiple uptime tracking sources
// - Redundancy for mission-critical application

// ============================================================
