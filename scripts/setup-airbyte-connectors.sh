#!/usr/bin/env bash
# Live Diligence — create the Exa Airbyte connector (web search via CLI).
# Stripe billing stays on direct STRIPE_SECRET_KEY (not Airbyte).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi

: "${AIRBYTE_CLIENT_ID:?Set AIRBYTE_CLIENT_ID in .env}"
: "${AIRBYTE_CLIENT_SECRET:?Set AIRBYTE_CLIENT_SECRET in .env}"
: "${AIRBYTE_ORGANIZATION_ID:?Set AIRBYTE_ORGANIZATION_ID in .env}"

WORKSPACE="${AIRBYTE_WORKSPACE:-default}"

echo "Airbyte workspace: ${WORKSPACE}"
echo "Existing connectors:"
airbyte-agent connectors list --json "{\"workspace\":\"${WORKSPACE}\"}" || true

echo "Creating connector: exa (browser will open for credentials)..."
airbyte-agent connectors create --json "{\"workspace\":\"${WORKSPACE}\",\"name\":\"exa\"}"

echo ""
echo "Done. Verify:"
airbyte-agent connectors list --json "{\"workspace\":\"${WORKSPACE}\"}"
