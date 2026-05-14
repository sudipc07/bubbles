#!/usr/bin/env bash
#
# Bubbles — one-shot EC2 setup. Idempotent; safe to re-run.
#
# Run on the EC2 box (52.6.169.112) as root after cloning the repo to /home/ubuntu/bubbles:
#   ssh -i /Users/sudiptohome/Store/ResumeFolio.pem ubuntu@52.6.169.112
#   git clone <repo-url> /home/ubuntu/bubbles
#   sudo /home/ubuntu/bubbles/deploy/setup.sh
#
set -euo pipefail

APP_USER="ubuntu"
REPO_DIR="/home/${APP_USER}/bubbles"
FRONTEND_DIR="/opt/bubbles/frontend"
ENV_FILE="${REPO_DIR}/.env"
DB_NAME="bubbles"
DB_USER="bubbles"
NGINX_CONF_SRC="${REPO_DIR}/deploy/nginx-bubbles.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/bubbles"

require_root() {
  if [[ "$EUID" -ne 0 ]]; then
    echo "must run as root (use sudo)" >&2
    exit 1
  fi
}

step() { echo; echo "→ $*"; }

require_root

step "Verify host prerequisites (Node 22, pnpm, PM2, nginx, certbot, postgres) — all installed by ResumeFolio setup"
for bin in node pnpm pm2 nginx certbot psql; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "missing dependency: $bin (ResumeFolio setup should have installed it)" >&2
    exit 1
  fi
done
node --version

step "Ensure repo and ownership"
mkdir -p "$REPO_DIR"
chown -R "${APP_USER}:${APP_USER}" "$REPO_DIR"

step "Create Postgres role + database (idempotent)"
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" || true)

if [[ "$USER_EXISTS" != "1" ]]; then
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
  echo "created postgres user ${DB_USER} (password stored in .env)"
  NEW_DB_PASS="$DB_PASS"
else
  echo "postgres user ${DB_USER} already exists; reusing"
  NEW_DB_PASS=""
fi

if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  echo "created database ${DB_NAME}"
fi

step "Create /home/ubuntu/bubbles/.env if missing"
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -z "$NEW_DB_PASS" ]]; then
    echo "ERROR: postgres user exists but no password recorded. Edit ${ENV_FILE} manually." >&2
    exit 1
  fi
  SESSION_SECRET=$(openssl rand -hex 32)
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3001
PUBLIC_URL=https://bubbles.work

DATABASE_URL=postgresql://${DB_USER}:${NEW_DB_PASS}@127.0.0.1:5432/${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}

EMAIL_PROVIDER=ses
AWS_REGION=ap-south-1
SES_FROM_EMAIL=Bubbles <no-reply@resume-folio.app>

S3_BUCKET=bubbles
S3_REGION=ap-south-1

# Paste the same OPENAI_API_KEY as ResumeFolio's .env, then re-run setup or pm2 restart bubbles-api
OPENAI_API_KEY=

DEFAULT_MONTHLY_COST_CEILING_USD=20
EOF
  chown "${APP_USER}:${APP_USER}" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "wrote ${ENV_FILE} — fill in OPENAI_API_KEY before agents will work"
else
  echo "${ENV_FILE} already exists; leaving alone"
fi

step "Install dependencies + build"
sudo -u "$APP_USER" bash -lc "cd ${REPO_DIR} && pnpm install --frozen-lockfile && pnpm run build"

step "Apply database schema (drizzle push)"
sudo -u "$APP_USER" bash -lc "cd ${REPO_DIR} && set -a && . ${ENV_FILE} && set +a && pnpm --filter @bubbles/backend run db:push"

step "Publish frontend to ${FRONTEND_DIR}"
mkdir -p "$FRONTEND_DIR"
rm -rf "${FRONTEND_DIR:?}"/*
cp -r "${REPO_DIR}/frontend/dist/." "${FRONTEND_DIR}/"

step "Install nginx server block"
cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
ln -sf "$NGINX_CONF_DST" "/etc/nginx/sites-enabled/bubbles"
nginx -t
nginx -s reload

step "Start/restart bubbles-api under PM2 (as ${APP_USER})"
sudo -u "$APP_USER" bash -lc "
  cd ${REPO_DIR}/backend
  if pm2 describe bubbles-api >/dev/null 2>&1; then
    pm2 restart bubbles-api --update-env
  else
    pm2 start dist/index.mjs \
      --name bubbles-api \
      --node-args='--env-file-if-exists=${ENV_FILE} --enable-source-maps' \
      --cwd ${REPO_DIR}/backend
  fi
  pm2 save
"

step "Issue TLS cert for bubbles.work (skip if already issued)"
if ! certbot certificates 2>/dev/null | grep -q "bubbles.work"; then
  certbot --nginx -d bubbles.work -d www.bubbles.work --non-interactive --agree-tos -m sudipto.chanda@rode.com --redirect
else
  echo "cert already present; skipping"
fi

step "Health check"
sleep 2
curl -sf http://127.0.0.1:3001/api/healthz && echo
curl -sIk https://bubbles.work/ | head -n 1 || true

echo
echo "✓ Setup complete. Browse https://bubbles.work/"
