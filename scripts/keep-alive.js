const axios = require('axios');

const URLS = [
  //'https://quizplay-backend.onrender.com/health',
  'https://api.quizplay.co.in',
  'https://www.quizplay.co.in/'
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function pingWithRetry(url, retries = 0) {
  try {
    console.log(`[${new Date().toISOString()}] Pinging: ${url}`);
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
    });
    console.log(`✓ Success: ${url} (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.error(`✗ Error pinging ${url}:`, error.message);
    
    if (retries < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY / 1000} seconds... (Attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return pingWithRetry(url, retries + 1);
    }
    
    return false;
  }
}

async function keepAlive() {
  console.log('Starting keep-alive process...');
  
  try {
    const results = await Promise.all(
      URLS.map(url => pingWithRetry(url))
    );
    
    const successCount = results.filter(Boolean).length;
    console.log(`\n[${new Date().toISOString()}] Keep-alive check completed: ${successCount}/${URLS.length} URLs pinged successfully`);
    
    process.exit(successCount > 0 ? 0 : 1);
  } catch (error) {
    console.error('Keep-alive process failed:', error);
    process.exit(1);
  }
}

keepAlive();