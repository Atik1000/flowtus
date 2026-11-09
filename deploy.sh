#!/usr/bin/env bash
# FLOWTUS one-command production deploy.
#
#   ./deploy.sh            deploy everything (API -> Render, storefront + admin -> Vercel)
#   ./deploy.sh web        deploy only the storefront
#   ./deploy.sh admin      deploy only the admin panel
#   ./deploy.sh api        deploy only the API (push to GitHub; Render auto-deploys)
#
# Production URLs:
#   storefront  https://flowtus.xyz          (Vercel project: flowtus-web)
#   admin       https://admin.flowtus.xyz    (Vercel project: flowtus-admin)
#   api         https://flowtus-api.onrender.com  (Render, from render.yaml)
#
# Note: pushing to GitHub main already auto-deploys all three (Vercel Git
# integration + Render). The Vercel CLI deploys below additionally deploy
# your local working tree directly, so uncommitted changes go live too.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export VERCEL_ORG_ID="team_gqtGJsKEY1RGQH2m9twsaoJb"   # atik1000s-projects
WEB_PROJECT_ID="prj_mGX5CNdqIGUdrQbWcNgALXOIhqkT"      # flowtus-web
ADMIN_PROJECT_ID="prj_ycJe1xdwOGUwbmE8fj2iZbAXCdMd"    # flowtus-admin
TARGET="${1:-all}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }

command -v vercel >/dev/null || { echo "vercel CLI missing: npm i -g vercel"; exit 1; }

deploy_vercel() { # $1 = project id, $2 = name, $3 = public URL
  bold "Deploying $2 -> $3"
  # Deploy from the repo root: the Vercel project's Root Directory setting
  # (apps/web or apps/admin) is resolved against the uploaded repo.
  (cd "$ROOT" && VERCEL_PROJECT_ID="$1" vercel deploy --prod --yes)
}

deploy_api() {
  bold "Deploying API (git push -> Render auto-deploy)"
  cd "$ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    echo "NOTE: you have uncommitted changes; Render builds what is on GitHub main."
  fi
  git push origin main
  # Optional: set RENDER_DEPLOY_HOOK (Render dashboard -> flowtus-api -> Settings
  # -> Deploy Hook) to force a Render deploy even without new commits.
  if [ -n "${RENDER_DEPLOY_HOOK:-}" ]; then
    curl -fsS -X POST "$RENDER_DEPLOY_HOOK" >/dev/null && echo "Render deploy hook triggered."
  fi
}

health() {
  bold "Health checks"
  for url in "https://flowtus-api.onrender.com/api/health" "https://flowtus.xyz" "https://admin.flowtus.xyz"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 90 -L "$url" || true)
    echo "  $url -> $code"
  done
  echo "(Free Render instances sleep when idle: the first API request can take ~60s.)"
}

case "$TARGET" in
  web)   deploy_vercel "$WEB_PROJECT_ID" flowtus-web https://flowtus.xyz ;;
  admin) deploy_vercel "$ADMIN_PROJECT_ID" flowtus-admin https://admin.flowtus.xyz ;;
  api)   deploy_api ;;
  all)
    deploy_api
    deploy_vercel "$WEB_PROJECT_ID" flowtus-web https://flowtus.xyz
    deploy_vercel "$ADMIN_PROJECT_ID" flowtus-admin https://admin.flowtus.xyz
    health
    ;;
  *) echo "usage: ./deploy.sh [all|web|admin|api]"; exit 1 ;;
esac

bold "Done."
