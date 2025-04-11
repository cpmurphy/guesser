#! /bin/bash

set -e
set -x

if [ -n "$(git status -s)" ]; then
  echo "Uncommitted changes found! Aborting."
  exit 1
fi

SCRIPT_DIR=$(dirname "$0")

# load the deployment environment variables
# Needed are: DEPLOY_USER, DEPLOY_HOST, DEPLOY_DIR
# shellcheck source=deploy_env.sh
. "${SCRIPT_DIR}"/../deploy_env.sh

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

# run a script on the server to deploy the new version
# ensure that we don't keep running if any of the commands fail
ssh "${DEPLOY_USER}"@"${DEPLOY_HOST}" "DEPLOY_DIR=${DEPLOY_DIR}" 'bash -s' <<'EOF'
set -e
set -x
cd "${DEPLOY_DIR}"
bunzip2 chess_guesser.tar.bz2
docker load -i chess_guesser.tar
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
rm chess_guesser.tar
# prune any unused docker images
docker system prune -f
EOF
