# Post-PR Deployment Workflow

## Overview
This workflow ensures the local development server and Cloudflare Tunnel are running after PRs are merged.

## Automated Steps (To be implemented)

### Option A: GitHub Actions (Recommended)
Create `.github/workflows/post-pr-deploy.yml`:

```yaml
name: Post-PR Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: self-hosted  # Requires self-hosted runner
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Restart Dev Server
        run: |
          # Kill existing server
          fuser -k 3010/tcp 2>/dev/null || true
          # Start new server
          cd /home/csiesheep/.openclaw/boardgame-betrayal
          rm -rf apps/web/.next
          npm run dev &
      
      - name: Restart Cloudflare Tunnel
        run: |
          # Kill existing tunnel
          pkill -f cloudflared || true
          sleep 2
          # Start new tunnel
          cloudflared tunnel run &
      
      - name: Health Check
        run: |
          sleep 10
          curl -f http://localhost:3010/betrayal || exit 1
          echo "✅ Server and tunnel are up!"
```

### Option B: Simple Script (Current)
Create `scripts/post-pr-deploy.sh`:

```bash
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
npm run dev &
SERVER_PID=$!

# 4. Kill existing tunnel
echo "Stopping existing tunnel..."
pkill -f cloudflared || true
sleep 2

# 5. Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run &
TUNNEL_PID=$!

# 6. Health check
echo "Waiting for services to start..."
sleep 15

if curl -f http://localhost:3010/betrayal > /dev/null 2>&1; then
    echo "✅ Local server is up!"
else
    echo "❌ Local server failed to start"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo "Local: http://localhost:3010/betrayal/"
echo "Public: https://game.csiesheep.com/betrayal/"
```

## Manual Steps (Current Process)

After PR approval and push:

1. **Check server status:**
   ```bash
   curl http://localhost:3010/betrayal || echo "Server down"
   ```

2. **Check tunnel status:**
   ```bash
   cloudflared tunnel status
   ```

3. **Restart if needed:**
   ```bash
   # Kill existing
   fuser -k 3010/tcp 2>/dev/null
   pkill -f cloudflared
   
   # Start server
   cd /home/csiesheep/.openclaw/boardgame-betrayal
   rm -rf apps/web/.next
   npm run dev &
   
   # Start tunnel
   cloudflared tunnel run &
   ```

## URLs

| Service | URL |
|---------|-----|
| Local Dev | http://localhost:3010/betrayal/ |
| Public (Cloudflare) | https://game.csiesheep.com/betrayal/ |

## Checklist for Orchestrator

After each PR approval:
- [ ] Push changes to remote
- [ ] Verify local server is running
- [ ] Verify Cloudflare tunnel is running
- [ ] Test public URL
- [ ] Report status to user
