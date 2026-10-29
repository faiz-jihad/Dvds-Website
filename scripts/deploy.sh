#!/usr/bin/env bash
# ==============================================================================
# DVD zone UK — Production Auto-Deploy Script
# Pulls latest from git main, builds the Vite frontend bundle, and reloads PM2
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/dvds-zone"
LOG_FILE="${APP_DIR}/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cd "$APP_DIR"

log "========================================================"
log "Starting automated deployment for DVD zone UK..."
log "========================================================"

# 1. Fetch latest changes from GitHub main
log "Step 1/4: Fetching latest commits from origin/main..."
git fetch origin main 2>&1 | tee -a "$LOG_FILE"
git reset --hard origin/main 2>&1 | tee -a "$LOG_FILE"

# 2. Install dependencies
log "Step 2/4: Verifying Node modules..."
npm install --no-audit --no-fund --production=false 2>&1 | tee -a "$LOG_FILE"

# 3. Build frontend production distribution
log "Step 3/4: Building Vite frontend bundle..."
npm run build 2>&1 | tee -a "$LOG_FILE"

# 4. Gracefully reload PM2 process
log "Step 4/4: Reloading PM2 process 'dvds-zone' with updated environment..."
pm2 reload dvds-zone --update-env 2>&1 | tee -a "$LOG_FILE"

log "========================================================"
log "Deployment completed successfully! Site is live."
log "========================================================"
