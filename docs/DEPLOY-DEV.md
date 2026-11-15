# Discovery Studio — DEV deployment

How the DEV container is built and run on a Docker host, sitting behind a
reverse proxy at a hostname supplied by env (not hardcoded anywhere in this
repo).

## What's in the repo

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build → a minimal, non-root `node:22-alpine` production image (Next.js `output: "standalone"`). Exposes `3000`, has a container `HEALTHCHECK` against `/api/health`. |
| `docker-compose.yml` | One service, `discovery-studio-app-dev`, plus one named volume (`discovery_studio_data`) for all runtime data. |
| `.env.example` | Names of every env var the app and compose file read. Copy to `.env` and fill in real values — never commit `.env`. |
| `app/api/health/route.ts` | `GET /api/health` → `{ "status": "ok", "version": "<package.json version>" }`. Used by the Docker healthcheck and can be curled directly to confirm the container is up. |

## Runtime data

`lib/store.ts` persists all passes/customers/sessions/specs as one JSON
file, `passes.json`, under the directory named by the `DATA_DIR` env var
(default `./data` outside a container). `docker-compose.yml` sets
`DATA_DIR=/data` inside the container and mounts the named volume
`discovery_studio_data` at that path, so the data survives
`docker compose down` / image rebuilds / container replacement. It does
**not** survive `docker compose down -v` (deletes volumes) or
`docker volume rm discovery_studio_data` — treat those as destructive.

`tests/deploy.test.ts` fails the build if `DATA_DIR` and the compose
volume's mount target ever drift apart, or if the mount source stops being
a named volume declared in `docker-compose.yml`'s top-level `volumes:`.

## Reverse proxy

`docker-compose.yml` assumes the Docker host already runs a Traefik
instance with an external Docker network named `proxy` — the convention
this org's other DEV containers already use — and that DNS for the DEV
hostname already resolves to that host. The service joins that network and
carries Traefik labels that route `Host(`${APP_HOSTNAME}`)` to it over
TLS (`letsencrypt` resolver), on container port `3000`.

`APP_HOSTNAME` is read from `.env` (see `.env.example`) — it is never
hardcoded in `docker-compose.yml`. Point it at whatever DEV hostname DNS
has been given for this app before bringing the service up.

If the target host does **not** run Traefik, replace the `networks:` /
`labels:` block in `docker-compose.yml` with a loopback-only port publish,
and point whatever reverse proxy the host does run (nginx, Caddy, a
Cloudflare Tunnel, …) at it instead:

```yaml
    ports:
      - "127.0.0.1:${APP_PORT:-3000}:3000"
```

## Build and run

```bash
# From the repo root, with .env already created from .env.example:
docker compose build
docker compose up -d

# Confirm it's healthy:
docker compose ps
curl -s http://127.0.0.1:3000/api/health   # only works if port-published; otherwise curl via the proxy hostname
```

To rebuild after a code change:

```bash
docker compose build discovery-studio-app-dev
docker compose up -d
```

To tear down (keeps the named volume, and therefore the data, intact):

```bash
docker compose down
```

## Required env vars

See `.env.example` for the full, current list with explanatory comments.
At minimum for a working DEV deploy: `ADMIN_API_TOKEN`, `APP_HOSTNAME`.
`DISCOVERY_AGENT_API_KEY` is optional — if unset, the interviewer agent
runs on its deterministic offline engine instead of calling out to a model
(see `lib/interviewer.ts`).

## What this doc does not cover

Provisioning the Docker host itself, DNS for `APP_HOSTNAME`, the Traefik
instance and its `proxy` network, or any Cloudflare Access application in
front of `/center` and `/api/admin/*` — those are host/account-level setup
done once, outside this repo, before `docker compose up -d` is run here.
