#!/bin/bash
set -e

echo "🚀 Post-PR Deployment Script"

# 1. Kill existing server
echo "Stopping existing server..."
fuser -k 3010/tcp 2>/dev/null || true

# 2. Clear Next.js cache
echo "Clearing Next.js cache..."
cd /home/csiesheep/.openclaw/boardgame-betrayal
rm -rf apps/web/.next

# 3. Start dev server
echo "Starting dev server..."
nohup npm run dev > /tmp/betrayal-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# 4. Kill existing tunnel
echo "Stopping existing tunnel..."
pkill -f cloudflared || true
sleep 2

# 5. Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
nohup cloudflared tunnel run > /tmp/betrayal-tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# 6. Health check
echo "Waiting for services to start..."
sleep 15

echo ""
echo "Checking local server..."
if curl -f http://localhost:3010/betrayal > /dev/null 2>&1; then
    echo "✅ Local server is up!"
else
    echo "❌ Local server failed to start"
    echo "Check logs: /tmp/betrayal-server.log"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo "Local: http://localhost:3010/betrayal/"
echo "Public: https://game.csiesheep.com/betrayal/"
echo ""
echo "Logs:"
echo "  Server: /tmp/betrayal-server.log"
echo "  Tunnel: /tmp/betrayal-tunnel.log"
