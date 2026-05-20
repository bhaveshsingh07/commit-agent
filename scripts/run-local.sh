#!/usr/bin/env bash
# =====================================================================
# BMAD Code Guardian — local diff scan
#
# Run the orchestrator against a local diff file, useful for testing
# prompt changes before merging to the central repo.
#
# Usage:
#   ./scripts/run-local.sh /tmp/push_modifications.diff
#
# Required env:
#   COPILOT_PAT       Personal Access Token with copilot scope
#   GITHUB_TOKEN      Any token (only used to attempt PR comment posting)
#
# Optional env:
#   PR_NUMBER         Defaults to 0 (skips PR comment)
#   GITHUB_REPOSITORY Defaults to "local/test"
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DIFF_PATH="${1:-}"
if [[ -z "$DIFF_PATH" ]]; then
  echo "Usage: $0 <path-to-diff>"
  echo
  echo "Generate one with:"
  echo "  git diff main...HEAD > /tmp/push_modifications.diff"
  exit 1
fi

if [[ ! -f "$DIFF_PATH" ]]; then
  echo "No such diff: $DIFF_PATH" >&2
  exit 1
fi

if [[ -z "${COPILOT_PAT:-}" ]]; then
  echo "COPILOT_PAT not set. Export it first:" >&2
  echo "  export COPILOT_PAT=ghp_..." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -d dist ]]; then
  echo "[run-local] dist/ missing — building"
  npm run build
fi

export DIFF_PATH
export GITHUB_TOKEN="${GITHUB_TOKEN:-dummy}"
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-local/test}"
export PR_NUMBER="${PR_NUMBER:-0}"
export PR_HEAD_SHA="${PR_HEAD_SHA:-$(git rev-parse HEAD 2>/dev/null || echo local)}"
export PR_AUTHOR="${PR_AUTHOR:-$(whoami)}"
export PR_TITLE="${PR_TITLE:-Local scan}"
export PR_URL="${PR_URL:-http://local}"

echo "[run-local] Scanning $DIFF_PATH"
node dist/index.js || {
  ec=$?
  echo "[run-local] Orchestrator exited with code $ec (1 = violations found)"
  exit $ec
}
