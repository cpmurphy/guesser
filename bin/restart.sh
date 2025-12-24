#! /bin/bash
set -o nounset
set -o errexit

SCRIPT_DIR=$(dirname "$0")

# load the deployment environment variables
# Needed are: DEPLOY_USER, DEPLOY_HOST, DEPLOY_DIR
# shellcheck source=deploy_env.sh
. "${SCRIPT_DIR}"/../deploy_env.sh

# run a script on the server to deploy the new version
# ensure that we don't keep running if any of the commands fail
ssh "${DEPLOY_USER}"@"${DEPLOY_HOST}" "DEPLOY_DIR=${DEPLOY_DIR}" "APP_NAME=${APP_NAME}" 'bash -s' <<'EOF'
set -o nounset
set -o errexit
set -x
cd "${DEPLOY_DIR}"
docker stop "$APP_NAME" || true
docker rm "$APP_NAME" || true
# now run the image using regular docker
docker run -d --name "$APP_NAME" -p 3000:3000 \
  -e RACK_ENV=production \
 --restart=unless-stopped \
 --log-driver json-file \
 --log-opt max-size=10m \
 --log-opt max-file=3 "$APP_NAME"
EOF
