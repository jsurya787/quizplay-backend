#!/bin/bash

# Render Sleep Fix - Setup Guide
# This script provides instructions for setting up external cron monitoring

echo "=================================================="
echo "  Render Free Tier Sleep Fix - Setup Guide"
echo "=================================================="
echo ""

# Test the health endpoint
echo "🔍 Testing health endpoint..."
curl -s https://api.quizplay.co.in/health | jq . 2>/dev/null || curl -s https://api.quizplay.co.in/health

echo ""
echo "=================================================="
echo "SETUP INSTRUCTIONS"
echo "=================================================="
echo ""

echo "📋 OPTION 1: Setup with cron-job.org (Recommended - Free)"
echo "─────────────────────────────────────────────────────"
echo "1. Visit: https://cron-job.org/en/"
echo "2. Sign up for a free account"
echo "3. Create a new cron job with these settings:"
echo "   • Title: Quiz API Keep-Alive"
echo "   • URL: https://api.quizplay.co.in/health"
echo "   • Execution times: * * * * */10"
echo "   • Notifications: enabled (optional)"
echo ""

echo "📋 OPTION 2: Setup with Uptime Robot (Free)"
echo "─────────────────────────────────────────────"
echo "1. Visit: https://uptimerobot.com/"
echo "2. Sign up for free account"
echo "3. Create a new HTTP monitor with:"
echo "   • URL: https://api.quizplay.co.in/health"
echo "   • Interval: Every 10 minutes"
echo "   • Monitor name: Quiz API Keep-Alive"
echo ""

echo "📋 OPTION 3: Setup with EasyCron (Free)"
echo "──────────────────────────────────────────"
echo "1. Visit: https://www.easycron.com/"
echo "2. Create a new cron job:"
echo "   • Cron Expression: */10 * * * *"
echo "   • URL: https://api.quizplay.co.in/health"
echo "   • Email notifications: optional"
echo ""

echo "✅ After Setup:"
echo "─────────────"
echo "1. Wait 10 minutes for first ping"
echo "2. Check Render logs: you should see requests from cron service"
echo "3. Verify server no longer sleeps"
echo ""

echo "📊 Monitor Server Status:"
echo "────────────────────────"
echo "Health Check: curl https://api.quizplay.co.in/health"
echo "Render Logs: https://dashboard.render.com"
echo ""

echo "💡 Tips:"
echo "──────"
echo "• Set interval to 10 minutes (keeps 15-min timer reset)"
echo "• Use /health endpoint instead of / for lighter pings"
echo "• Set up multiple services for redundancy"
echo "• Consider upgrade to paid tier if reliability critical"
echo ""

echo "=================================================="
