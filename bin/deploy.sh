#! /bin/bash

set -e
set -x

SCRIPT_DIR=$(dirname "$0")

# load the deployment environment variables
# Needed are: DEPLOY_USER, DEPLOY_HOST, DEPLOY_DIR
. "${SCRIPT_DIR}"/../deploy_env.sh

bzip2 chess_guesser.tar

# upload the tar file to the server
scp chess_guesser.tar.bz2 "${DEPLOY_USER}"@"${DEPLOY_HOST}":"${DEPLOY_DIR}"/chess_guesser.tar.bz2

# run a script on the server to deploy the new version
# ensure that we don't keep running if any of the commands fail
ssh "${DEPLOY_USER}"@"${DEPLOY_HOST}" 'bash -s' <<'EOF'
set -e
cd ${DEPLOY_DIR}
bunzip2 chess_guesser.tar.bz2
docker load -i chess_guesser.tar
# stop any old chess_guesser container
docker stop chess_guesser || true
# now run the image using regular docker
docker run -d -p 3000:3000 --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 chess-guesser
rm chess_guesser.tar
# prune any unused docker images
docker system prune -f
EOF
