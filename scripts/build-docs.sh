#!/usr/bin/env bash

set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly DIST_DIR="${PROJECT_ROOT}/dist/davidwebstar"
readonly DOCS_DIR="${PROJECT_ROOT}/docs"

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
  --exclude='_redirects' \
  "${DIST_DIR}/" "${DOCS_DIR}/"

# GitHub Pages serves this fallback for client-side Angular routes.
cp "${DOCS_DIR}/index.html" "${DOCS_DIR}/404.html"

echo "GitHub Pages build written to ${DOCS_DIR}"
