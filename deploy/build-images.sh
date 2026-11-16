#!/usr/bin/env bash
# Builds the chess-guesser image, and the stockfish-pool image unless
# BUILD_POOL_IMAGE=0. bin/deploy.sh sets that when the pool is already running
# on the server.
#
#   deploy/build-images.sh                    # x86-64-avx2 Stockfish build
#   STOCKFISH_ARCH=x86-64-sse41-popcnt deploy/build-images.sh   # CPUs without AVX2
#   BUILD_POOL_IMAGE=0 deploy/build-images.sh # web app only
#
# Stockfish must suit the CPU it will RUN on. Without STOCKFISH_ARCH this
# checks the local CPU; when building for another machine (bin/deploy.sh does),
# set STOCKFISH_ARCH for that machine and the local check is skipped.
set -euo pipefail

cd "$(dirname "$0")/.."
arch="${STOCKFISH_ARCH:-x86-64-avx2}"

if [ -z "${STOCKFISH_ARCH:-}" ] && ! grep -qw avx2 /proc/cpuinfo; then
  echo "This CPU has no AVX2; rerun with STOCKFISH_ARCH=x86-64-sse41-popcnt" >&2
  exit 1
fi

podman build --target app -t localhost/chess-guesser:app .

if [ "${BUILD_POOL_IMAGE:-1}" = 1 ]; then
  git submodule update --init Stockfish
  podman build -f stockfish-pool/Containerfile --build-arg STOCKFISH_ARCH="$arch" \
    -t localhost/stockfish-pool:latest .
  echo "Built localhost/chess-guesser:app and localhost/stockfish-pool:latest"
else
  echo "Built localhost/chess-guesser:app (left the stockfish-pool image out)"
fi
