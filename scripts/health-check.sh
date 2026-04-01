#!/bin/bash
# Health check script for Betrayal game server
# Run this after any changes to verify server is working

set -e

echo "🔍 Health Check - Betrayal Game Server"
echo "========================================"

# Check local server
echo ""
echo "1. Checking local server..."
if curl -sf http://localhost:3010/betrayal > /dev/null 2>&1; then
    echo "   ✅ Local server is UP (http://localhost:3010/betrayal)"
else
    echo "   ❌ Local server is DOWN"
    echo "   🔄 Restarting local server..."
    
    # Kill existing
    fuser -k 3010/tcp 2>/dev/null || true
    
    # Clear cache and restart
    cd /home/csiesheep/.openclaw/boardgame-betrayal
    rm -rf apps/web/.next
    npm run dev &
    
    # Wait for startup
    sleep 15
    
    if curl -sf http://localhost:3010/betrayal > /dev/null 2>&1; then
        echo "   ✅ Local server restarted successfully"
    else
        echo "   ❌ Failed to restart local server"
        exit 1
    fi
fi

# Check Cloudflare tunnel
echo ""
echo "2. Checking Cloudflare tunnel..."
if pgrep -f "cloudflared tunnel" > /dev/null; then
    echo "   ✅ Cloudflare tunnel is RUNNING"
else
    echo "   ❌ Cloudflare tunnel is DOWN"
    echo "   🔄 Restarting Cloudflare tunnel..."
    
    # Kill existing
    pkill -f cloudflared || true
    sleep 2
    
    # Start tunnel
    cloudflared tunnel run &
    sleep 5
    
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        echo "   ✅ Cloudflare tunnel restarted successfully"
    else
        echo "   ❌ Failed to restart Cloudflare tunnel"
        exit 1
    fi
fi

# Check public URL
echo ""
echo "3. Checking public URL..."
if curl -sf https://game.csiesheep.com/betrayal > /dev/null 2>&1; then
    echo "   ✅ Public URL is UP (https://game.csiesheep.com/betrayal)"
else
    echo "   ⚠️  Public URL may have issues (but tunnel is running)"
fi

echo ""
echo "========================================"
echo "🎉 Health check complete!"
echo ""
echo "URLs:"
echo "  Local:  http://localhost:3010/betrayal"
echo "  Public: https://game.csiesheep.com/betrayal"
