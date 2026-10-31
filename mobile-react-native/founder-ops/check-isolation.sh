#!/usr/bin/env bash
# Fails if a change mixes founder-ops/ with app code, or if app code reaches into founder-ops/.
# Run before committing: bash mobile-react-native/founder-ops/check-isolation.sh [base-ref]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
base="${1:-origin/main}"

changed=$( { git diff --name-only "$base"...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u )
ops=$(grep -c '^mobile-react-native/founder-ops/' <<<"$changed" || true)
# Markdown notes (AGENTS.md, READMEs) may point at founder-ops/; only code counts as app.
appfiles=$(grep -E '^(src|scripts|public|mobile-react-native)/' <<<"$changed" | grep -vE '^mobile-react-native/(founder-ops|marketing)/' | grep -v '\.md$' || true)
app=$(grep -c . <<<"$appfiles" || true)

if [ "$ops" -gt 0 ] && [ "$app" -gt 0 ]; then
  echo "Mixed change: founder-ops/ and app code in the same branch. Split them into separate PRs."
  echo "$appfiles"
  exit 1
fi

if grep -rlE 'founder-ops' src mobile-react-native/src mobile-react-native/app mobile-react-native/supabase 2>/dev/null; then
  echo "App code references founder-ops/. App code must never read founder material."
  exit 1
fi

echo "OK: $ops founder-ops file(s), $app app file(s) changed."
