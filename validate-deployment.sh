#!/bin/bash

# Poly Myanmar GC - Deployment Validation Script
# Run this before deploying to ensure everything is ready

cd /Users/myrios/Downloads/poly-network

echo "🚀 Poly Myanmar GC - Deployment Validation"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILURES=0

echo "📦 Dependencies"
echo "==============="

echo -n "Node.js installed... "
command -v node &>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "npm installed... "
command -v npm &>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "Python 3.11+ installed... "
python3 --version 2>&1 | grep -E '3.1[1-9]|3\.[2-9]' >/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "uv installed... "
command -v uv &>/dev/null && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "Web dependencies installed... "
test -d apps/web/node_modules && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "API dependencies installed... "
test -d apps/api/.venv && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "🔨 Build & Compilation"
echo "====================="

echo -n "Web build succeeds... "
cd apps/web && npm run build >/dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }
cd /Users/myrios/Downloads/poly-network

echo -n "Web dist exists... "
test -d apps/web/dist && test -f apps/web/dist/index.html && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "TypeScript compiles... "
cd apps/web && npx tsc -b >/dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }
cd /Users/myrios/Downloads/poly-network

echo ""
echo "✨ Code Quality"
echo "==============="

echo -n "Web linting passes... "
cd apps/web && npm run lint >/dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }
cd /Users/myrios/Downloads/poly-network

echo -n "No uncommitted changes... "
[ -z "$(git status --porcelain 2>/dev/null)" ] && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⚠${NC} (informational)"

echo ""
echo "📋 Configuration"
echo "================"

echo -n "Database migrations exist... "
test -f supabase/migrations/0001_init.sql && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "Environment template exists... "
test -f .env.example && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "Web Vercel config exists... "
test -f apps/web/vercel.json && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "API Vercel config exists... "
test -f apps/api/vercel.json && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "API Vercel entrypoint exists... "
test -f apps/api/vercel_app.py && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "API requirements.txt exists... "
test -f apps/api/requirements.txt && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "🔐 Security"
echo "==========="

echo -n "CORS env var documented... "
grep -q 'CORS_ORIGINS' .env.example && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "API uses JWT validation... "
grep -q 'supabase_jwt_secret' apps/api/src/api/settings.py && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "📄 Documentation"
echo "================"

echo -n "Root README exists... "
test -f README.md && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo -n "Makefile exists... "
test -f Makefile && echo -e "${GREEN}✓${NC}" || { echo -e "${RED}✗${NC}"; FAILURES=$((FAILURES + 1)); }

echo ""
echo "🌍 Required Environment Variables"
echo "=================================="

get_env_value() {
  local key="$1"

  # 1) Prefer exported shell env vars.
  if [ -n "${!key}" ]; then
    printf '%s' "${!key}"
    return 0
  fi

  # 2) Fallback to .env file in repo root.
  if [ -f .env ]; then
    local line
    line=$(grep -E "^${key}=" .env | tail -n 1 || true)
    if [ -n "$line" ]; then
      local value
      value="${line#*=}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      if [ -n "$value" ]; then
        printf '%s' "$value"
        return 0
      fi
    fi
  fi

  return 1
}

REQUIRED_VARS=("ENVIRONMENT" "SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_JWT_SECRET" "TELEGRAM_BOT_TOKEN" "TELEGRAM_REVIEW_CHAT_ID" "CORS_ORIGINS")
MISSING=0

if [ -f .env ]; then
  echo "Using .env fallback for non-exported variables."
fi

for var in "${REQUIRED_VARS[@]}"; do
  if ! get_env_value "$var" >/dev/null; then
    echo -e "  ${RED}✗${NC} $var"
    MISSING=$((MISSING + 1))
  else
    echo -e "  ${GREEN}✓${NC} $var"
  fi
done

ENV_VALUE="$(get_env_value "ENVIRONMENT" 2>/dev/null || true)"
if [ -n "$ENV_VALUE" ] && [ "$ENV_VALUE" != "production" ]; then
  echo -e "  ${RED}✗${NC} ENVIRONMENT must be 'production' for deployment checks (current: $ENV_VALUE)"
  MISSING=$((MISSING + 1))
fi

echo ""
echo "📊 Summary"
echo "=========="

if [ $FAILURES -eq 0 ] && [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "✅ Production Ready!"
  exit 0
elif [ $FAILURES -eq 0 ]; then
  echo -e "${YELLOW}⚠ Ready, but configure environment variables:${NC}"
  echo ""
  echo "📌 Remaining Steps:"
  echo "   1. Set production environment variables"
  echo "   2. Deploy to your platform"
  echo "   3. Verify health endpoints"
  exit 0
else
  echo -e "${RED}✗ $FAILURES check(s) failed${NC}"
  echo ""
  echo "❌ Please fix failures above before deploying."
  exit 1
fi
