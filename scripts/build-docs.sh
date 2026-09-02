#!/usr/bin/env bash

set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DIST_DIR="${PROJECT_ROOT}/dist/davidwebstar"
readonly DOCS_DIR="${PROJECT_ROOT}/docs"
# Keep this list in sync with app-routing.module.ts, including redirects and gated routes.
readonly -a SPA_ROUTES=(
  "anchorkeep"
  "greenlight"
  "labs"
  "labs/llm-input-hardening"
  "safegit"
  "ventures"
  "ventures/anchorkeep"
  "ventures/greenlight"
  "ventures/safegit"
)

cd "${PROJECT_ROOT}"
npm run build

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "Build failed: ${DIST_DIR}/index.html was not generated." >&2
  exit 1
fi

mkdir -p "${DOCS_DIR}"
rsync -a --delete \
  --exclude='CNAME' \
  --exclude='.nojekyll' \
  "${DIST_DIR}/" "${DOCS_DIR}/"

# GitHub Pages cannot rewrite arbitrary paths to index.html. Create a real index
# document for every Angular route so direct visits return HTTP 200 before the
# client-side router takes over.
for route in "${SPA_ROUTES[@]}"; do
  route_dir="${DOCS_DIR}/${route}"
  mkdir -p "${route_dir}"
  cp "${DOCS_DIR}/index.html" "${route_dir}/index.html"
done

# Unknown paths still use GitHub Pages' normal 404 response.
cp "${DOCS_DIR}/index.html" "${DOCS_DIR}/404.html"

for route in "${SPA_ROUTES[@]}"; do
  route_index="${DOCS_DIR}/${route}/index.html"
  if [[ ! -f "${route_index}" ]] || ! cmp -s "${DOCS_DIR}/index.html" "${route_index}"; then
    echo "Build failed: route shell is missing or stale: ${route_index}" >&2
    exit 1
  fi
done

echo "GitHub Pages build written to ${DOCS_DIR} with ${#SPA_ROUTES[@]} direct-route shells"
