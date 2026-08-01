#!/usr/bin/env bash

# Compatibility wrapper. The actual sync is implemented in Node.js so it
# works consistently on local machines, GitHub Actions and Vercel build images.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/sync-kpi-app.js" "$@"
