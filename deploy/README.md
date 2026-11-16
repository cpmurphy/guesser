# Deploying chess-guesser publicly (rootless Podman + Caddy)

This runs the app as a rootless Podman container managed by systemd through
Quadlet, behind Caddy on the host:

```
internet ──TLS──> Caddy (host) ──> 127.0.0.1:3000 ──> chess-guesser ──sf-engine──> stockfish-pool
                                                      web app          (internal)   shared engines
```

- **chess-guesser** (`localhost/chess-guesser:app`): the web app, without Stockfish. It's published on `127.0.0.1:3000` only, its root filesystem is read-only, and it has no capabilities. It calls the pool at `http://stockfish-pool:4000`.
- **stockfish-pool** (`localhost/stockfish-pool:latest`): the engine service. A deploy leaves it alone when it is already running, and reuses its token instead of generating a new one.
  - It's on an internal network only, with no published ports and no route to the internet.
  - Its root filesystem is read-only, it has no capabilities, and it runs as a non-root user inside a separate user namespace.
  - Its cpu, memory and pids are capped.
- **Rate limits and quotas** are described in `stockfish-pool/README.md`. This deploy does not change them on a pool that is already running.

## Deploying from your workstation (bin/deploy.sh)

The quickest route builds on your machine and installs on the server over ssh:

```bash
cp deploy/deploy_env.sh.example deploy_env.sh   # once; set host, user, PUBLIC_URL
bin/deploy.sh
```

It refuses to run with uncommitted changes, then:
1. Runs the tests and lint (`SKIP_TESTS=1` skips them).
2. Asks the server whether stockfish-pool is already running. If it is, only the web image is built. If it is not, the pool image is built too.
3. Uploads the archive with `deploy/`.
4. Runs `deploy/remote-install.sh` on the server, which:
   - checks the host on the first install;
   - reuses an existing `API_TOKENS` or `ENGINE_TOKEN` (from this app or from chess-learner) and never replaces one that is already set;
   - always restarts chess-guesser, and starts stockfish-pool only when it is not already running;
   - waits until those services are healthy.
5. Checks `PUBLIC_URL` through Caddy. Caddy must proxy it to `127.0.0.1:3000`.

The server still needs the one-time `sudo` steps from step 1 below: linger and cgroup delegation. The first deploy tells you if they're missing.

Two more modes:
- `bin/deploy.sh --rollback` returns the server to the last good release. Rolling back twice in a row undoes the rollback.
- `bin/deploy.sh --build-only` produces the image archive without touching the server.

The steps below are the same work done by hand on the server.

## Deploying by hand

Everything below runs as the user that will own the containers. Use a dedicated user if you can, logged in directly over ssh: `su` and `sudo -u` don't start the systemd user session these steps need.

## 1. Check the host

```bash
git clone --recurse-submodules <this repository> ~/chess-guesser-src
cd ~/chess-guesser-src
deploy/check-host.sh
```

Fix anything it reports as `FAIL`. The usual ones:

- **Linger:** run `sudo loginctl enable-linger <user>`. This keeps the services running after you log out and starts them at boot.
- **cgroup delegation:** this is needed for the cpu limit, and the memory and pids limits.

  ```bash
  sudo mkdir -p /etc/systemd/system/user@.service.d
  printf '[Service]\nDelegate=cpu cpuset io memory pids\n' | \
    sudo tee /etc/systemd/system/user@.service.d/delegate.conf
  sudo systemctl daemon-reload
  ```

  Then log out completely and back in, and run the check again.
- **Subnets already in use:** `sf-engine` is shared with the pool. If `10.89.20.0/24` is taken by something else, edit `Subnet=` in `deploy/quadlet/sf-engine.network`. Do not give chess-guesser the other app's address on `sf-web`.

## 2. Build the images

```bash
deploy/build-images.sh                                  # CPUs with AVX2
STOCKFISH_ARCH=x86-64-sse41-popcnt deploy/build-images.sh   # CPUs without
```

This compiles Stockfish and `pgn2`'s Rust extension, so expect several minutes on a small VPS.

## 3. Configure

`bin/deploy.sh` does this. By hand:

```bash
mkdir -p ~/.config/chess-guesser
cp deploy/env/chess-guesser.env.example ~/.config/chess-guesser/chess-guesser.env
chmod 600 ~/.config/chess-guesser/chess-guesser.env
```

Set `ENGINE_TOKEN` to one token from the running pool's `API_TOKENS` (often `~/.config/chess-learner/stockfish-pool.env`). Do not generate a new token while that pool is already running. Write the value without quotes.

## 4. Install and start the services

```bash
mkdir -p ~/.config/containers/systemd
cp deploy/quadlet/chess-guesser.container ~/.config/containers/systemd/
# Only when stockfish-pool is not already running:
# cp deploy/quadlet/sf-engine.network deploy/quadlet/stockfish-pool.container ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user restart chess-guesser
systemctl --user status chess-guesser
```

Quadlet generates `chess-guesser.service`. It starts at boot because of linger and `WantedBy=default.target`. A container that crashes, or fails its health check three times in a row, is restarted. Do not restart `stockfish-pool` when the other app is using it.

## 5. Point Caddy at it

Add `deploy/caddy/chess-guesser.caddy` (with your hostname) to your Caddyfile, then run `sudo systemctl reload caddy`.

## 6. Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
podman healthcheck run chess-guesser && echo app healthy
```

Then open the site.

## Updating

```bash
cd ~/chess-guesser-src && git pull --recurse-submodules
deploy/build-images.sh
cp deploy/quadlet/* ~/.config/containers/systemd/ && systemctl --user daemon-reload
```

## Logs and troubleshooting

- `journalctl --user -u stockfish-pool -f` shows engine restarts (`worker N failed`) and start failures.
  - If every worker fails at start with "illegal instruction", Stockfish was built for the wrong CPU; see step 2.
- `curl` can't reach `/healthz` from the host, because the engine has no published port. Use `podman exec chess-guesser ruby -rnet/http -e 'puts Net::HTTP.get(URI("http://stockfish-pool:4000/healthz"))'`.
- `systemctl --user stop chess-guesser` stops this app. Stop `stockfish-pool` only when this deploy is the one that started it; the other app may be using it. Removing this app's unit from `~/.config/containers/systemd/` and running `daemon-reload` uninstalls it.
