#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node build.mjs
node scripts/check.mjs
