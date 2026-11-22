#!/usr/bin/env bash
# Restarts a service on the server named in deploy_env.sh without deploying
# a new release, then waits for its container to report healthy.
#
#   bin/restart.sh            restart the web app ($FRONTEND_NAME)
#   bin/restart.sh pool       restart the engine service ($BACKEND_NAME); this
#                             also interrupts chess-learner if it shares the pool
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

case "${1:-app}" in
  app) service=$FRONTEND_NAME ;;
  pool) service=$BACKEND_NAME ;;
  *) echo "usage: bin/restart.sh [app | pool]" >&2; exit 2 ;;
esac

echo "Restarting $service on $DEPLOY_HOST"
# shellcheck disable=SC2029 # $service is meant to expand here
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "SERVICE=$service bash -s" <<'EOF'
set -euo pipefail
# systemctl --user needs the user's runtime directory; non-interactive ssh
# sessions do not always set it.
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
systemctl --user restart "$SERVICE.service"
for attempt in $(seq 1 60); do
  if podman healthcheck run "$SERVICE" >/dev/null 2>&1; then
    echo "$SERVICE: healthy"
    exit 0
  fi
  [ "$attempt" -lt 60 ] && sleep 2
done
echo "$SERVICE did not become healthy. Recent journal:" >&2
journalctl --user -u "$SERVICE.service" -n 40 --no-pager >&2 || true
exit 1
EOF
