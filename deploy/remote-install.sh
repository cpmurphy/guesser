#!/usr/bin/env bash
# Installs a release on the server: run as the deploy user (bin/deploy.sh does
# this over ssh). It always installs chess-guesser. It installs and starts
# stockfish-pool only when that service is not already running, and it never
# replaces an engine token that already exists (chess-learner is often the
# app that created it).
#
#   deploy/remote-install.sh <images.tar.gz>   install a release
#   deploy/remote-install.sh --rollback        roll the web app back to the
#       last good image. The pool is rolled back only when this app started
#       it (see manages-stockfish-pool). Rolling back twice returns to where
#       you started.
#
# Environment: FRONTEND_NAME / BACKEND_NAME (default chess-guesser /
# stockfish-pool), STOCKFISH_ARCH, SKIP_HOST_CHECK=1, RELEASE.
set -euo pipefail

release_dir=$(cd "$(dirname "$0")/.." && pwd)
frontend=${FRONTEND_NAME:-chess-guesser}
backend=${BACKEND_NAME:-stockfish-pool}
release=${RELEASE:-unknown}
app_image=localhost/${frontend}:app
pool_image=localhost/${backend}:latest

# Commands, overridable so the script can be exercised without a server.
podman_cmd=${PODMAN:-podman}
systemctl_cmd=${SYSTEMCTL:-systemctl --user}
journal_cmd=${JOURNALCTL:-journalctl --user}
health_attempts=${HEALTH_ATTEMPTS:-60}

config_dir=$HOME/.config/chess-guesser
unit_dir=$HOME/.config/containers/systemd
# Present only after this deploy is the one that started the pool.
pool_marker=$config_dir/manages-stockfish-pool
app_env=$config_dir/chess-guesser.env
pool_env=$config_dir/stockfish-pool.env

# systemctl --user needs the user's runtime directory; non-interactive ssh
# sessions do not always set it.
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}

step() { printf '\n==> %s\n' "$1"; }
die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

for name in "$frontend" "$backend"; do
  [ -f "$release_dir/deploy/quadlet/$name.container" ] ||
    die "no deploy/quadlet/$name.container; FRONTEND_NAME/BACKEND_NAME must match the unit file names"
done

pool_is_running() {
  if $systemctl_cmd is-active --quiet "$backend"; then
    return 0
  fi
  local state
  state=$($podman_cmd inspect --format '{{.State.Running}}' "$backend" 2>/dev/null || true)
  [ "$state" = true ]
}

wait_healthy() {
  local container=$1 attempt
  for attempt in $(seq 1 "$health_attempts"); do
    $podman_cmd healthcheck run "$container" >/dev/null 2>&1 && return 0
    [ "$attempt" -lt "$health_attempts" ] && sleep 2
  done
  return 1
}

image_id() { $podman_cmd image inspect --format '{{.Id}}' "$1" 2>/dev/null || true; }

# After a release passes its health checks: the old :good becomes :previous.
remember_good_release() {
  local image good current
  for image in "$@"; do
    good=$(image_id "${image%:*}:good")
    current=$(image_id "$image")
    [ -n "$current" ] || continue
    if [ -n "$good" ] && [ "$good" != "$current" ]; then
      $podman_cmd tag "${image%:*}:good" "${image%:*}:previous"
    fi
    $podman_cmd tag "$image" "${image%:*}:good"
  done
}

random_hex() { # $1 bytes of randomness as hex
  openssl rand -hex "$1" 2>/dev/null || od -An -N"$1" -tx1 /dev/urandom | tr -d ' \n'
}

# The non-empty value of KEY in FILE, or nothing.
config_value() {
  local file=$1 key=$2 line
  [ -f "$file" ] || return 0
  line=$(grep -E "^${key}=" "$file" | head -1 || true)
  printf '%s' "${line#"${key}="}" | tr -d '[:space:]'
}

# A token the running pool will accept, if any app on this machine already has one.
# Sets FOUND_TOKEN and FOUND_KIND=api|engine. API_TOKENS may list several tokens,
# and that whole list is kept so the other app's token is not dropped.
found_token() {
  local file value
  FOUND_TOKEN=
  FOUND_KIND=
  for file in \
    "$HOME/.config/chess-learner/stockfish-pool.env" \
    "$pool_env"
  do
    value=$(config_value "$file" API_TOKENS)
    if [ -n "$value" ]; then
      FOUND_KIND=api
      FOUND_TOKEN=$value
      return 0
    fi
  done
  for file in "$app_env" "$HOME/.config/chess-learner/chess-learner.env"; do
    value=$(config_value "$file" ENGINE_TOKEN)
    if [ -n "$value" ]; then
      FOUND_KIND=engine
      FOUND_TOKEN=$value
      return 0
    fi
  done
  return 1
}

first_token() { printf '%s' "$1" | cut -d, -f1; }

# Set KEY=VALUE in FILE, creating FILE from EXAMPLE when it is missing.
# An existing non-empty value is left exactly as it is.
ensure_config() {
  local file=$1 key=$2 value=$3 example=$4
  umask 077
  if [ ! -f "$file" ]; then
    sed "s/^${key}=$/${key}=${value}/" "$example" > "$file"
    chmod 600 "$file"
    echo "Created $file"
  elif [ -z "$(config_value "$file" "$key")" ]; then
    if grep -qE "^${key}=" "$file"; then
      sed -i "s/^${key}=$/${key}=${value}/" "$file"
    else
      printf '%s=%s\n' "$key" "$value" >> "$file"
    fi
    echo "Filled in empty ${key} in $file"
  else
    echo "Keeping the existing ${key} in $file"
  fi
  umask 022
}

configure_tokens() {
  local engine_token api_tokens
  step "Configuration"
  mkdir -p "$config_dir" "$unit_dir"
  chmod 700 "$config_dir"

  if found_token; then
    echo "Reusing the engine token that is already configured."
    engine_token=$(first_token "$FOUND_TOKEN")
    if [ "$FOUND_KIND" = api ]; then
      api_tokens=$FOUND_TOKEN
    else
      api_tokens=$engine_token
    fi
  elif [ "$pool_running" -eq 1 ]; then
    die "stockfish-pool is running but no API_TOKENS or ENGINE_TOKEN was found to reuse"
  else
    echo "No existing engine token found; generating one for this install."
    engine_token=$(random_hex 32)
    api_tokens=$engine_token
  fi

  ensure_config "$app_env" ENGINE_TOKEN "$engine_token" \
    "$release_dir/deploy/env/chess-guesser.env.example"
  # The running pool keeps the env file it was started with. Writing a second
  # copy here would not change it, and must not replace chess-learner's file.
  if [ "$pool_running" -eq 0 ]; then
    ensure_config "$pool_env" API_TOKENS "$api_tokens" \
      "$release_dir/deploy/env/stockfish-pool.env.example"
  fi
}

install_units() {
  local unit target units
  step "Installing Quadlet units"
  units=("$release_dir/deploy/quadlet/$frontend.container")
  if [ "$pool_running" -eq 0 ]; then
    units+=("$release_dir/deploy/quadlet/sf-engine.network")
    units+=("$release_dir/deploy/quadlet/$backend.container")
  else
    echo "Leaving the running $backend unit and sf-engine network in place."
  fi
  for unit in "${units[@]}"; do
    target=$unit_dir/$(basename "$unit")
    if cmp -s "$unit" "$target"; then
      echo "unchanged: $(basename "$unit")"
    else
      install -m 0644 "$unit" "$target"
      echo "installed: $(basename "$unit")"
    fi
  done
}

restart_and_wait() {
  local container services containers
  if [ "$pool_running" -eq 1 ]; then
    services=("$frontend.service")
    step "Restarting $frontend (stockfish-pool stays as it is)"
  else
    services=("$backend.service" "$frontend.service")
    step "Starting $backend and restarting $frontend"
    touch "$pool_marker"
  fi
  $systemctl_cmd daemon-reload
  # shellcheck disable=SC2086 # $systemctl_cmd is a command plus its options
  $systemctl_cmd restart "${services[@]}"

  step "Waiting for services to report healthy"
  if [ "$pool_running" -eq 0 ]; then
    containers=("$backend" "$frontend")
  else
    containers=("$frontend")
  fi
  for container in "${containers[@]}"; do
    if wait_healthy "$container"; then
      echo "$container: healthy"
    else
      echo "$container did not become healthy. Recent journal for $container.service:" >&2
      $journal_cmd -u "$container.service" -n 40 --no-pager >&2 || $podman_cmd logs --tail 40 "$container" >&2 || true
      echo "To go back to the previous release: deploy/remote-install.sh --rollback" >&2
      exit 1
    fi
  done
}

managed_images() {
  printf '%s\n' "$app_image"
  [ -f "$pool_marker" ] && printf '%s\n' "$pool_image"
  return 0
}

if [ "${1:-}" = "--rollback" ]; then
  pool_running=0
  [ -f "$pool_marker" ] || pool_running=1
  mapfile -t images < <(managed_images)
  target=previous
  for image in "${images[@]}"; do
    [ "$(image_id "$image")" = "$(image_id "${image%:*}:good")" ] || target=good
  done
  step "Rolling back to the :$target images"
  for image in "${images[@]}"; do
    $podman_cmd image exists "${image%:*}:$target" || die "no ${image%:*}:$target image to roll back to"
  done
  for image in "${images[@]}"; do
    $podman_cmd tag "${image%:*}:$target" "$image"
  done
  restart_and_wait
  [ "$target" = previous ] && remember_good_release "${images[@]}"
  echo
  echo "Rolled back to the :$target release."
  exit 0
fi

archive=${1:?usage: deploy/remote-install.sh <images.tar.gz> | --rollback}
[ -f "$archive" ] || die "image archive $archive not found"

if [ "${STOCKFISH_ARCH:-x86-64-avx2}" = "x86-64-avx2" ] && ! grep -qw avx2 /proc/cpuinfo; then
  die "this CPU has no AVX2 but the engine was built for x86-64-avx2; set STOCKFISH_ARCH=x86-64-sse41-popcnt in deploy_env.sh"
fi

if pool_is_running; then
  pool_running=1
  echo "stockfish-pool is already running; this deploy will not replace it or its token."
else
  pool_running=0
fi

if [ ! -f "$unit_dir/$frontend.container" ] && [ "${SKIP_HOST_CHECK:-}" != 1 ]; then
  step "First install: checking the host"
  "$release_dir/deploy/check-host.sh" || die "fix the failed checks above (see deploy/README.md), then deploy again"
fi

step "Loading images for release $release"
$podman_cmd load -i "$archive"
$podman_cmd image exists "$app_image" || die "archive has no $app_image"
if [ "$pool_running" -eq 0 ]; then
  $podman_cmd image exists "$pool_image" ||
    die "stockfish-pool is not running and the archive has no $pool_image"
fi

configure_tokens
install_units
restart_and_wait
if [ "$pool_running" -eq 1 ]; then
  remember_good_release "$app_image"
else
  remember_good_release "$app_image" "$pool_image"
fi

step "Cleaning up"
rm -f "$archive"
$podman_cmd image prune -f >/dev/null # dangling images only; other apps' images and containers are left alone
echo
echo "Release $release is running."
