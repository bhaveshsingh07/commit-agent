#!/usr/bin/env bash
# =====================================================================
# BMAD Code Guardian — macOS setup script
#
# Installs Homebrew (if needed), Node 20, builds the orchestrator,
# and runs a self-test on the prompts and JSON schema.
#
# Tested on macOS 13 Ventura, 14 Sonoma, 15 Sequoia, Apple Silicon & Intel.
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log()  { printf "\033[1;34m[setup]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[setup]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[setup]\033[0m %s\n" "$*" >&2; }

# ---- 0. Sanity: are we on macOS?
if [[ "$(uname -s)" != "Darwin" ]]; then
  err "This script is for macOS. Detected: $(uname -s). Aborting."
  exit 1
fi

ARCH="$(uname -m)"
log "macOS detected ($ARCH)"

# ---- 1. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew not found — installing"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Make brew available in this shell
  if [[ "$ARCH" == "arm64" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    eval "$(/usr/local/bin/brew shellenv)"
  fi
else
  log "Homebrew present: $(brew --version | head -1)"
fi

# ---- 2. Node 20
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  CURRENT_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$CURRENT_MAJOR" -ge 20 ]]; then
    log "Node already at $(node -v)"
    NEED_NODE=0
  fi
fi

if [[ "$NEED_NODE" -eq 1 ]]; then
  log "Installing Node 20 via Homebrew"
  brew install node@20 || true
  brew link --overwrite --force node@20 || true
fi

# ---- 3. Git (Xcode CLT bundles git, but check anyway)
if ! command -v git >/dev/null 2>&1; then
  warn "git not found — installing via Homebrew"
  brew install git
fi
log "git: $(git --version)"

# ---- 4. Install npm deps & build
cd "$ROOT_DIR"
log "Installing npm dependencies"
npm install --no-audit --no-fund

log "Compiling TypeScript orchestrator"
npm run build

# ---- 5. Smoke test the prompts and schema
log "Validating prompts and JSON schema"
npm run lint:prompts
npm run lint:schema

# ---- 6. Done
cat <<EOF

\033[1;32m✓ Setup complete.\033[0m

Next steps:
  1. Read SETUP.md for the server-side install (self-hosted runner + ruleset).
  2. To try the orchestrator against a local diff:
       git diff main...HEAD > /tmp/push_modifications.diff
       ./scripts/run-local.sh /tmp/push_modifications.diff
  3. To install this machine as a GitHub self-hosted runner:
       ./scripts/install-runner-mac.sh --org <YOUR_ORG> --token <REG_TOKEN>

EOF
