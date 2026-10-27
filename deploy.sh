#!/bin/bash
# deploy.sh — Actualiza y reinicia logistic-app en producción
set -e

export PATH=$PATH:/usr/local/bin:~/.local/bin
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🔄 Pulling latest changes from $CURRENT_BRANCH..."
git checkout -- package-lock.json deploy.sh 2>/dev/null || true
git fetch origin "$CURRENT_BRANCH"
git reset --hard "origin/$CURRENT_BRANCH"

echo "📦 Installing dependencies..."
npm install --production=false --no-save
git checkout -- package-lock.json 2>/dev/null || true

echo "🔨 Building..."
npm run build

echo "♻️  Restarting PM2 process..."
pm2 restart logistic-app --update-env

echo "✅ Deploy completado!"
pm2 status logistic-app
