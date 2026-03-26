#!/usr/bin/env bash
set -euo pipefail

# ─── Colours ────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $1"; }
info() { echo -e "${YELLOW}→${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; exit 1; }
banner() {
  echo ""
  echo -e "${BOLD}$1${RESET}"
  echo "────────────────────────────────────────"
}

# ─── Header ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  QUORUM — Setup${RESET}"
echo -e "  Multi-Agent Deliberation Platform"
echo ""

# ─── 1. Node.js ─────────────────────────────────────────────────────────────
banner "Checking dependencies"

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install it from https://nodejs.org (v18+) and re-run setup."
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js v18+ required (found v$NODE_VERSION). Update at https://nodejs.org"
fi
ok "Node.js v$NODE_VERSION"

# ─── 2. Dolt ────────────────────────────────────────────────────────────────
if ! command -v dolt &>/dev/null; then
  info "Dolt not found — installing..."
  if command -v brew &>/dev/null; then
    brew install dolt
  else
    # Official install script (works on macOS and Linux)
    curl -fsSL https://github.com/dolthub/dolt/releases/latest/download/install.sh | bash
  fi
fi

DOLT_VERSION=$(dolt version | head -1 | awk '{print $3}')
ok "Dolt $DOLT_VERSION"

# ─── 3. npm install ─────────────────────────────────────────────────────────
banner "Installing packages"
npm install --silent
ok "npm packages installed"

# ─── 4. .env ────────────────────────────────────────────────────────────────
banner "Environment"

if [ -f .env ]; then
  ok ".env already exists — skipping"
else
  cat > .env <<'EOF'
ANTHROPIC_API_KEY=your_key_here
DOLT_DATA_DIR=./quorum-db
EOF
  echo ""
  echo -e "  ${YELLOW}Action required:${RESET} Open ${BOLD}.env${RESET} and replace ${BOLD}your_key_here${RESET} with your Anthropic API key."
  echo -e "  Get one at ${BOLD}https://console.anthropic.com${RESET}"
  echo ""
fi

# ─── 5. Database ────────────────────────────────────────────────────────────
banner "Database"

DATA_DIR="${DOLT_DATA_DIR:-./quorum-db}"
DB_DIR="$DATA_DIR/quorum"

if [ -d "$DB_DIR/.dolt" ]; then
  ok "Dolt database already initialised at $DB_DIR"
else
  info "Initialising Dolt database..."
  bash scripts/init-dolt.sh
  ok "Database ready"
fi

# ─── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  Setup complete.${RESET}"
echo ""

if grep -q "your_key_here" .env 2>/dev/null; then
  echo -e "  ${YELLOW}Before starting:${RESET} add your Anthropic API key to ${BOLD}.env${RESET}"
  echo ""
fi

echo -e "  Start the platform:"
echo -e "  ${BOLD}npm run dev:full${RESET}"
echo ""
echo -e "  Then open ${BOLD}http://localhost:5173${RESET}"
echo ""
