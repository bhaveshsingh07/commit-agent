#!/usr/bin/env bash
# =====================================================================
# BMAD Code Guardian — workspace purification
#
# Run BEFORE every scan on a self-hosted runner to eliminate
# cross-contamination between sequential repository builds. Safe to
# call when nothing exists yet.
# =====================================================================
set -euo pipefail

TARGET="${1:-${GITHUB_WORKSPACE:-$PWD}}"

log() { printf "\033[1;34m[clean]\033[0m %s\n" "$*"; }

log "Purifying $TARGET"

# Anything we control
rm -rf "$TARGET/.guardian-tmp" || true
rm -rf "$TARGET/.guardian" || true

# Stale tmp artefacts in /tmp (only ours)
rm -f /tmp/push_modifications.diff || true
rm -rf /tmp/guardian-* || true

log "Done."
