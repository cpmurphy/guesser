# syntax = docker/dockerfile:1

# This Dockerfile is designed for production, not development.
# docker build -t chess-guesser .
# docker run -d -p 80:80 -p 443:443 --name chess-guesser chess-guesser

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.4.1
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

WORKDIR /app

# Install only essential packages
RUN mkdir -p /app/bin && \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y libjemalloc2 && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV APP_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test" \
    PATH="$PATH:/app/bin" \
    RAILS_LOG_TO_STDOUT="1"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install build dependencies (clang/libclang-dev are required to compile pgn2)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential curl git wget pkg-config clang libclang-dev && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Distro cargo is too old for pgn2's Cargo.lock (version 4 needs Cargo 1.78+)
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH="/usr/local/cargo/bin:$PATH"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --profile minimal --default-toolchain stable

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

# Build Stockfish
COPY Stockfish Stockfish
RUN cd Stockfish/src && \
    make clean && \
    CXXFLAGS='-march=native' make -j2 clean profile-build ARCH=x86-64-avx2 && \
    strip stockfish && \
    mv stockfish /app/bin/ && \
    cd / && rm -rf Stockfish

# Final stage
FROM base

# Copy only necessary artifacts from build stage
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /app/bin/stockfish /app/bin/stockfish
# Copy only what the app needs at runtime. A blanket "COPY ." would pull in the
# Stockfish source tree, and deleting it afterwards doesn't shrink the image.
COPY Gemfile Gemfile.lock config.ru chess_guesser.rb ./
COPY bin/docker-entrypoint bin/
COPY data data
COPY i18n i18n
COPY lib lib
COPY public public
COPY views views

# Set up non-root user. The app doesn't write to /app, so the files stay
# root-owned; a recursive chown would duplicate every file in a new layer.
RUN groupadd --system --gid 1000 appgroup && \
    useradd appuser --uid 1000 --gid 1000 --create-home --shell /bin/bash
USER appuser

# Start the server by default, this can be overwritten at runtime
ENTRYPOINT ["/app/bin/docker-entrypoint"]
EXPOSE 3000
CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "-p", "3000"]
