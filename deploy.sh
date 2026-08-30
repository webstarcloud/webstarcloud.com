#!/usr/bin/env bash

set -euo pipefail

readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
readonly EXPECTED_BRANCH="main"
readonly EXPECTED_DOMAIN="davidwebstar.com"
readonly REMOTE_NAME="origin"

usage() {
  printf '%s\n' \
    'Usage: ./deploy.sh [--yes] "commit message"' \
    '' \
    'Builds the production site into docs/, commits every current repository' \
    'change, and pushes main to GitHub for https://davidwebstar.com/.' \
    '' \
    'Options:' \
    '  --yes       Skip the final interactive confirmation.' \
    '  -h, --help  Show this help.'
}

fail() {
  printf 'Deploy stopped: %s\n' "$1" >&2
  exit 1
}

confirm_deploy() {
  if [[ "${ASSUME_YES}" == "true" ]]; then
    return
  fi

  if [[ ! -t 0 ]]; then
    fail 'interactive confirmation is unavailable; rerun with --yes after reviewing the changes.'
  fi

  printf 'Proceed with this deployment to origin/main? [y/N] '
  read -r reply
  case "${reply}" in
    y|Y|yes|YES|Yes) ;;
    *) fail 'deployment cancelled; no commit or push was made. Any staged changes were left intact.' ;;
  esac
}

is_expected_origin_url() {
  case "$1" in
    git@github.com:webstarcloud/webstarcloud.com.git|\
    git@github.com:webstarcloud/webstarcloud.com|\
    ssh://git@github.com/webstarcloud/webstarcloud.com.git|\
    ssh://git@github.com/webstarcloud/webstarcloud.com|\
    https://github.com/webstarcloud/webstarcloud.com.git|\
    https://github.com/webstarcloud/webstarcloud.com) return 0 ;;
    *) return 1 ;;
  esac
}

find_sensitive_paths() {
  {
    git log -m --diff-filter=ACMR --name-only --format= \
      "${REMOTE_NAME}/${EXPECTED_BRANCH}..HEAD"
    git diff --cached --name-only --diff-filter=ACMR
  } | LC_ALL=C sort -u | while IFS= read -r changed_path; do
    filename="${changed_path##*/}"
    case "${filename}" in
      .env.example|.env.sample|.env.template) ;;
      .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.jks|id_rsa|id_ed25519|credentials.json|service-account*.json)
        printf '%s\n' "${changed_path}"
        ;;
    esac
  done
}

ASSUME_YES=false
if [[ "${1:-}" == "--yes" ]]; then
  ASSUME_YES=true
  shift
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$#" -ne 1 || -z "${1//[[:space:]]/}" ]]; then
  usage >&2
  exit 2
fi
readonly COMMIT_MESSAGE="$1"

for required_command in git npm rsync; do
  command -v "${required_command}" >/dev/null 2>&1 || \
    fail "required command is not installed: ${required_command}"
done

cd "${PROJECT_ROOT}"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "${repo_root}" ]] || fail 'this script is not inside a Git repository.'
repo_root="$(cd "${repo_root}" && pwd -P)"
[[ "${repo_root}" == "${PROJECT_ROOT}" ]] || \
  fail 'run this script from its own web project repository.'

current_branch="$(git branch --show-current)"
[[ "${current_branch}" == "${EXPECTED_BRANCH}" ]] || \
  fail "current branch must be ${EXPECTED_BRANCH}; found ${current_branch:-detached HEAD}."

for git_state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-apply rebase-merge; do
  git_state_path="$(git rev-parse --git-path "${git_state}")"
  [[ ! -e "${git_state_path}" ]] || \
    fail "finish the active Git operation (${git_state}) before deploying."
done

origin_fetch_url="$(git remote get-url "${REMOTE_NAME}" 2>/dev/null || true)"
origin_push_url="$(git remote get-url --push "${REMOTE_NAME}" 2>/dev/null || true)"
is_expected_origin_url "${origin_fetch_url}" && is_expected_origin_url "${origin_push_url}" || \
  fail 'origin fetch and push URLs must point to the expected GitHub repository.'

printf 'Checking origin/main...\n'
git fetch --quiet --no-tags "${REMOTE_NAME}" "${EXPECTED_BRANCH}" || \
  fail 'could not fetch origin/main; check the network and GitHub credentials.'
git show-ref --verify --quiet "refs/remotes/${REMOTE_NAME}/${EXPECTED_BRANCH}" || \
  fail 'origin/main was not found after fetching.'
git merge-base --is-ancestor "${REMOTE_NAME}/${EXPECTED_BRANCH}" HEAD || \
  fail 'local main is behind or has diverged from origin/main; reconcile it before deploying.'

printf 'Building the GitHub Pages site for %s...\n' "${EXPECTED_DOMAIN}"
npm run build:docs

for required_output in docs/index.html docs/404.html docs/CNAME; do
  [[ -f "${required_output}" ]] || fail "build output is missing ${required_output}."
done

cname="$(tr -d '\r\n' < docs/CNAME)"
[[ "${cname}" == "${EXPECTED_DOMAIN}" ]] || \
  fail "docs/CNAME must contain only ${EXPECTED_DOMAIN}."

git add -A -- .
git diff --cached --check || fail 'staged changes contain whitespace errors; they remain staged for review.'

sensitive_path="$(find_sensitive_paths)"
[[ -z "${sensitive_path}" ]] || \
  fail "refusing to deploy potentially sensitive file(s): ${sensitive_path}"

if ! git diff --cached --quiet; then
  printf 'Commit summary:\n'
  git diff --cached --stat
  confirm_deploy
  git commit -m "${COMMIT_MESSAGE}"
else
  ahead_count="$(git rev-list --count "${REMOTE_NAME}/${EXPECTED_BRANCH}..HEAD")"
  if [[ "${ahead_count}" == "0" ]]; then
    printf 'Nothing to deploy: main already matches origin/main.\n'
    exit 0
  fi

  printf '%s local commit(s) are ready to push.\n' "${ahead_count}"
  confirm_deploy
fi

if [[ -n "$(git status --porcelain)" ]]; then
  fail 'the working tree changed during commit hooks; review it before pushing. The local commit was kept.'
fi

sensitive_path="$(find_sensitive_paths)"
[[ -z "${sensitive_path}" ]] || \
  fail "refusing to push potentially sensitive file(s): ${sensitive_path}"

printf 'Pushing main to GitHub...\n'
if ! git push "${REMOTE_NAME}" HEAD:"${EXPECTED_BRANCH}"; then
  fail 'GitHub did not confirm the push. The local commit was kept; verify origin/main before retrying.'
fi

printf 'Pushed successfully. GitHub Pages will publish https://%s/ asynchronously.\n' "${EXPECTED_DOMAIN}"
