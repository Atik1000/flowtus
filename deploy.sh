#!/usr/bin/env bash
# FLOWTUS one-command production deploy.
#
#   ./deploy.sh            deploy everything (API via git push -> Render, web + admin -> Vercel)
#   ./deploy.sh web        deploy only the storefront
#   ./deploy.sh admin      deploy only the admin panel
#   ./deploy.sh api        deploy only the API (push to GitHub; Render auto-deploys)
#
# Production URLs:
#   storefront  https://flowtus.xyz          (Vercel project: flowtus-web)
#   admin       https://admin.flowtus.xyz    (Vercel project: flowtus-admin)
#   api         https://flowtus-api.onrender.com  (Render, from render.yaml)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SCOPE="atik1000s-projects"
TARGET="${1:-all}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }

command -v vercel >/dev/null || { echo "vercel CLI missing: npm i -g vercel"; exit 1; }

link_if_needed() { # $1 = app dir, $2 = vercel project name
  [ -f "$ROOT/apps/$1/.vercel/project.json" ] ||
    (cd "$ROOT/apps/$1" && vercel link --yes --project "$2" --scope "$SCOPE" >/dev/null)
}

deploy_vercel() { # $1 = app dir, $2 = project name, $3 = public URL
  bold "Deploying $2 -> $3"
  link_if_needed "$1" "$2"
  (cd "$ROOT/apps/$1" && vercel deploy --prod --yes --scope "$SCOPE")
}

deploy_api() {
  bold "Deploying API (git push -> Render auto-deploy)"
  cd "$ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    echo "NOTE: you have uncommitted changes; Render deploys what is on GitHub main."
  fi
  git push origin main
  # Optional: set RENDER_DEPLOY_HOOK (Render dashboard -> flowtus-api -> Settings -> Deploy Hook)
  # to force a deploy even without new commits.
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
  web)   deploy_vercel web flowtus-web https://flowtus.xyz ;;
  admin) deploy_vercel admin flowtus-admin https://admin.flowtus.xyz ;;
  api)   deploy_api ;;
  all)
    deploy_api
    deploy_vercel web flowtus-web https://flowtus.xyz
    deploy_vercel admin flowtus-admin https://admin.flowtus.xyz
    health
    ;;
  *) echo "usage: ./deploy.sh [all|web|admin|api]"; exit 1 ;;
esac

bold "Done."
