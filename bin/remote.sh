#!/usr/bin/env bash
# Opens a shell in, or follows the logs of, a container on the server named
# in deploy_env.sh.
#
#   bin/remote.sh [bash]       shell in the web app container (default)
#   bin/remote.sh logs         follow the web app's journal
#   bin/remote.sh pool-logs    follow the engine service's journal
#
# deploy_env.sh (repository root, not committed; see deploy/deploy_env.sh.example)
# sets DEPLOY_USER and DEPLOY_HOST, and optionally FRONTEND_NAME and BACKEND_NAME.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f deploy_env.sh ] || { echo "deploy_env.sh not found; copy deploy/deploy_env.sh.example" >&2; exit 1; }
# shellcheck source=/dev/null
. ./deploy_env.sh

: "${DEPLOY_USER:?set DEPLOY_USER in deploy_env.sh}"
: "${DEPLOY_HOST:?set DEPLOY_HOST in deploy_env.sh}"
FRONTEND_NAME=${FRONTEND_NAME:-chess-guesser}
BACKEND_NAME=${BACKEND_NAME:-stockfish-pool}

remote="${DEPLOY_USER}@${DEPLOY_HOST}"
# Rootless podman and journalctl --user need the user's runtime directory;
# ssh sessions that run a command do not always set it.
# shellcheck disable=SC2016 # expanded on the server, not here
runtime='export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)};'

# shellcheck disable=SC2029 # the names are meant to expand here
case "${1:-bash}" in
  bash) ssh -t "$remote" "$runtime podman exec -it '$FRONTEND_NAME' bash" ;;
  logs) ssh -t "$remote" "$runtime journalctl --user -u '$FRONTEND_NAME.service' -f" ;;
  pool-logs) ssh -t "$remote" "$runtime journalctl --user -u '$BACKEND_NAME.service' -f" ;;
  *) echo "usage: bin/remote.sh [bash | logs | pool-logs]" >&2; exit 2 ;;
esac
