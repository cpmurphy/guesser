#! /bin/bash

set -e
set -x

if [ -n "$(git status -s)" ]; then
  echo "Uncommitted changes found! Aborting."
  exit 1
fi

SCRIPT_DIR=$(dirname "$0")

# load the deployment environment variables
# Needed are: DEPLOY_USER, DEPLOY_HOST, DEPLOY_DIR, ENGINE_URL, ENGINE_TOKEN
# Optional: ENGINE_NETWORK, when the pool is already on a Docker network
# shellcheck source=deploy_env.sh
. "${SCRIPT_DIR}"/../deploy_env.sh

if [ -z "${ENGINE_URL}" ] || [ -z "${ENGINE_TOKEN}" ]; then
  echo "Set ENGINE_URL and ENGINE_TOKEN in deploy_env.sh before deploying." >&2
  exit 1
fi

rake smoke

rake bump_version
rake docker_build

rm -f chess_guesser.tar
rm -f chess_guesser.tar.bz2

# save the docker image to a tar file
docker save -o chess_guesser.tar chess_guesser

bzip2 chess_guesser.tar

# upload the tar file to the server
scp chess_guesser.tar.bz2 "${DEPLOY_USER}"@"${DEPLOY_HOST}":"${DEPLOY_DIR}"/chess_guesser.tar.bz2

# The pool token stays in this file, which is removed on the server after the
# container starts. Tracing is off so the token is not printed.
set +x
previous_umask=$(umask)
umask 077
engine_env=$(mktemp)
printf 'ENGINE_URL=%s\nENGINE_TOKEN=%s\n' "$ENGINE_URL" "$ENGINE_TOKEN" > "$engine_env"
scp "$engine_env" "${DEPLOY_USER}"@"${DEPLOY_HOST}":"${DEPLOY_DIR}"/engine.env
rm -f "$engine_env"
umask "$previous_umask"
set -x

# run a script on the server to deploy the new version
# ensure that we don't keep running if any of the commands fail
ssh "${DEPLOY_USER}"@"${DEPLOY_HOST}" \
  "DEPLOY_DIR=${DEPLOY_DIR} ENGINE_NETWORK=${ENGINE_NETWORK-}" 'bash -s' <<'EOF'
set -e
set -x
cd "${DEPLOY_DIR}"
bunzip2 chess_guesser.tar.bz2
docker load -i chess_guesser.tar
# stop any old chess_guesser container
docker stop chess_guesser || true
docker rm chess_guesser || true
# now run the image using regular docker
network_args=()
if [ -n "${ENGINE_NETWORK}" ]; then
  network_args=(--network "${ENGINE_NETWORK}")
fi
docker run -d --name chess_guesser -p 127.0.0.1:3000:3000 \
  -e RACK_ENV=production \
  --env-file "${DEPLOY_DIR}/engine.env" \
  --add-host=host.docker.internal:host-gateway \
  "${network_args[@]}" \
 --restart=unless-stopped \
 --log-driver json-file \
 --log-opt max-size=10m \
 --log-opt max-file=3 chess_guesser
rm -f chess_guesser.tar engine.env
# prune any unused docker images
docker system prune -f
EOF
