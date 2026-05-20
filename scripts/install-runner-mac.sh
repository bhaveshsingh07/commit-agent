#!/usr/bin/env bash
# =====================================================================
# BMAD Code Guardian — macOS GitHub self-hosted runner installer
#
# Downloads the latest actions/runner release for macOS, configures it
# for an organization, and registers it as a launchd service so it
# survives reboots.
#
# Usage:
#   ./scripts/install-runner-mac.sh \
#       --org bhaveshsingh07 \
#       --token AABBCCDDEEFF... \
#       --labels "self-hosted,macos,arm64,code-guardian"
# =====================================================================
set -euo pipefail

log()  { printf "\033[1;34m[runner]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[runner]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[runner]\033[0m %s\n" "$*" >&2; }

# ---- Args
ORG=""
TOKEN=""
LABELS="self-hosted,macos,code-guardian"
RUNNER_DIR="$HOME/actions-runner"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org)    ORG="$2"; shift 2 ;;
    --token)  TOKEN="$2"; shift 2 ;;
    --labels) LABELS="$2"; shift 2 ;;
    --dir)    RUNNER_DIR="$2"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$ORG" || -z "$TOKEN" ]]; then
  err "--org and --token are required"
  err "Get the registration token from GitHub:"
  err "  Org Settings → Actions → Runners → New self-hosted runner"
  exit 1
fi

# ---- 0. macOS only
if [[ "$(uname -s)" != "Darwin" ]]; then
  err "macOS only. Detected: $(uname -s)"
  exit 1
fi

ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  arm64)  RUNNER_ARCH="osx-arm64" ;;
  x86_64) RUNNER_ARCH="osx-x64"   ;;
  *) err "Unsupported arch: $ARCH_RAW"; exit 1 ;;
esac
log "Architecture: $ARCH_RAW -> $RUNNER_ARCH"

# ---- 1. Fetch the latest runner version from GitHub
log "Resolving latest actions/runner release"
LATEST_TAG="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
  | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -1)"
if [[ -z "$LATEST_TAG" ]]; then
  err "Failed to resolve latest runner version"
  exit 1
fi
log "Latest runner: v$LATEST_TAG"

# ---- 2. Download + unpack
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

TARBALL="actions-runner-${RUNNER_ARCH}-${LATEST_TAG}.tar.gz"
URL="https://github.com/actions/runner/releases/download/v${LATEST_TAG}/${TARBALL}"
if [[ ! -f "$TARBALL" ]]; then
  log "Downloading $URL"
  curl -fSL -o "$TARBALL" "$URL"
else
  log "$TARBALL already present, skipping download"
fi
log "Unpacking"
tar xzf "$TARBALL"

# ---- 3. Configure
log "Configuring runner against https://github.com/$ORG"
./config.sh \
  --unattended \
  --url "https://github.com/$ORG" \
  --token "$TOKEN" \
  --labels "$LABELS" \
  --name "$(hostname)-guardian" \
  --work "_work"

# ---- 4. Install as launchd service
log "Installing as launchd service"
./svc.sh install
./svc.sh start
./svc.sh status

cat <<EOF

\033[1;32m✓ Runner installed and running.\033[0m

Verify in: https://github.com/organizations/$ORG/settings/actions/runners
You should see a runner named "$(hostname)-guardian" with labels: $LABELS

Logs: tail -f $RUNNER_DIR/_diag/Runner_*.log
Stop / start / restart:
  cd $RUNNER_DIR
  ./svc.sh stop
  ./svc.sh start
  ./svc.sh status

EOF
