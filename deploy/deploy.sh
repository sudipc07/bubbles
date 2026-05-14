#!/usr/bin/env bash
#
# Bubbles — pull latest and redeploy. Run on EC2 as ubuntu (not root).
#
#   ssh -i /Users/sudiptohome/Store/ResumeFolio.pem ubuntu@52.6.169.112
#   /home/ubuntu/bubbles/deploy/deploy.sh
#
set -euo pipefail

REPO_DIR="/home/ubuntu/bubbles"
FRONTEND_DIR="/opt/bubbles/frontend"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

echo "→ Fetching ${BRANCH} (hard reset — no merge surprises)..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"
git log --oneline -1

echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

echo "→ Building..."
pnpm run build

echo "→ Pushing database schema..."
pnpm --filter @bubbles/backend run db:push

echo "→ Publishing frontend..."
sudo rm -rf "${FRONTEND_DIR:?}"/*
sudo cp -r "${REPO_DIR}/frontend/dist/." "${FRONTEND_DIR}/"

echo "→ Restarting API..."
pm2 restart bubbles-api --update-env

echo
echo "✓ Deployed. Health:"
curl -sf http://127.0.0.1:3002/api/healthz && echo
