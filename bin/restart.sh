#! /bin/bash

set -e
set -x

SCRIPT_DIR=$(dirname "$0")

# load the deployment environment variables
# Needed are: DEPLOY_USER, DEPLOY_HOST, DEPLOY_DIR
# shellcheck source=deploy_env.sh
. "${SCRIPT_DIR}"/../deploy_env.sh

# run a script on the server to deploy the new version
# ensure that we don't keep running if any of the commands fail
ssh "${DEPLOY_USER}"@"${DEPLOY_HOST}" "DEPLOY_DIR=${DEPLOY_DIR}" 'bash -s' <<'EOF'
set -e
set -x
cd "${DEPLOY_DIR}"
# stop any old chess_guesser container
docker stop chess_guesser || true
docker rm chess_guesser || true
# now run the image using regular docker
docker run -d --name chess_guesser -p 3000:3000 \
  -e RACK_ENV=production \
 --restart=unless-stopped \
 --log-driver json-file \
 --log-opt max-size=10m \
 --log-opt max-file=3 chess_guesser
# prune any unused docker images
docker system prune -f
EOF
