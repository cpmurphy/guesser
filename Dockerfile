# syntax = docker/dockerfile:1

# This Dockerfile is designed for production, not development.
# docker build -t chess-guesser .
# docker run -d -p 80:80 -p 443:443 --name chess-guesser chess-guesser

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.2.3
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

WORKDIR /app

# Install only essential packages
RUN mkdir -p /app/bin && \
    apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libvips sqlite3 && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV APP_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test" \
    PATH="$PATH:/app/bin" \
    RAILS_LOG_TO_STDOUT="1"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install build dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git wget pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git

# Build Stockfish
COPY Stockfish Stockfish
RUN cd Stockfish/src && \
    make clean && \
    CXXFLAGS='-march=native' make -j2 clean profile-build ARCH=x86-64-avx2 && \
    mv stockfish /app/bin/ && \
    cd / && rm -rf Stockfish

# Final stage
FROM base

# Copy only necessary artifacts from build stage
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /app/bin/stockfish /app/bin/stockfish
COPY . /app

# Set up non-root user
RUN groupadd --system --gid 1000 appgroup && \
    useradd appuser --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R appuser:appgroup /app
USER appuser

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "-p", "3000"]
