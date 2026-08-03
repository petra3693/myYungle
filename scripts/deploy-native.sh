#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_VERCEL="${DEPLOY_VERCEL:-true}"
RUN_ANDROID="${RUN_ANDROID:-true}"
RUN_IOS="${RUN_IOS:-true}"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building web app..."
npm run build

if [[ "$DEPLOY_VERCEL" == "true" ]]; then
  echo "🚀 Deploying to Vercel (production)..."
  npx vercel --prod
else
  echo "⏭️  Skipping Vercel deploy (DEPLOY_VERCEL=false)"
fi

if [[ -f assets/icon.png || -f assets/icon-only.png ]]; then
  echo "🎨 Generating native icons and splash screens..."
  npx @capacitor/assets generate --ios --android
else
  echo "⏭️  Skipping asset generation (no assets/icon.png found)"
fi

echo "📱 Syncing Capacitor native projects..."
npx cap sync

if [[ "$RUN_ANDROID" == "true" ]]; then
  echo "🤖 Building and running on Android..."
  npx cap run android &
  ANDROID_PID=$!
else
  ANDROID_PID=""
fi

if [[ "$RUN_IOS" == "true" ]]; then
  echo "🍎 Building and running on iOS..."
  npx cap run ios &
  IOS_PID=$!
else
  IOS_PID=""
fi

if [[ -n "${ANDROID_PID}${IOS_PID}" ]]; then
  wait ${ANDROID_PID:+$ANDROID_PID} ${IOS_PID:+$IOS_PID} 2>/dev/null || true
fi

echo "✅ Done."
