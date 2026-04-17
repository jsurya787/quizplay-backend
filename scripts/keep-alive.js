/**
 * Keep-Alive Script for Render Free Tier
 * 
 * ⚠️  IMPORTANT: This script MUST be run from OUTSIDE Render
 * It should be scheduled with an external cron service like:
 * - cron-job.org
 * - EasyCron.com
 * - Uptime Robot (free tier)
 * - Or any other external monitoring service
 * 
 * Configuration:
 * - Interval: Every 10 minutes
 * - URL: https://api.quizplay.co.in/health
 * - Method: GET
 * 
 * Why external? Render spins down free tier apps after 15 minutes of inactivity.
 * Only pings from OUTSIDE Render count as activity.
 */

const axios = require('axios');

const URLS = [
  'https://api.quizplay.co.in/health',  // Health endpoint
  'https://api.quizplay.co.in',         // Main endpoint as fallback
];

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

async function pingWithRetry(url, retries = 0) {
  try {
    console.log(`[${new Date().toISOString()}] Pinging: ${url}`);
    const response = await axios.get(url, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Render-KeepAlive/1.0',
      },
    });
    console.log(`✓ Success: ${url} (Status: ${response.status})`);
    console.log(`  Response: ${JSON.stringify(response.data).substring(0, 100)}`);
    return true;
  } catch (error) {
    const errorMsg = error.response?.status 
      ? `HTTP ${error.response.status}` 
      : error.message;
    
    console.error(`✗ Error pinging ${url}: ${errorMsg}`);
    
    if (retries < MAX_RETRIES) {
      console.log(`  Retrying in ${RETRY_DELAY / 1000} seconds (Attempt ${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return pingWithRetry(url, retries + 1);
    }
    
    return false;
  }
}

async function keepAlive() {
  const startTime = Date.now();
  console.log('═'.repeat(60));
  console.log(`Starting keep-alive process at ${new Date().toISOString()}`);
  console.log('═'.repeat(60));
  
  try {
    const results = await Promise.all(
      URLS.map(url => pingWithRetry(url))
    );
    
    const successCount = results.filter(Boolean).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═'.repeat(60));
    console.log(`✓ Keep-alive completed in ${duration}s: ${successCount}/${URLS.length} URLs successful`);
    console.log('═'.repeat(60));
    
    process.exit(successCount > 0 ? 0 : 1);
  } catch (error) {
    console.error('✗ Keep-alive process failed:', error.message);
    process.exit(1);
  }
}

keepAlive();