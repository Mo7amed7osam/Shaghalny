# Deployment Guide

This document covers the supported deployment model in this repository: frontend on Vercel, backend on Azure Container Instances, container images in GitHub Container Registry, and monitoring through the local Grafana stack.

## Deployment Overview

- Frontend image: `ghcr.io/mo7amed7osam/shaghalny/frontend`
- Backend image: `ghcr.io/mo7amed7osam/shaghalny/backend`
- Frontend runtime: Vercel
- Backend runtime: Azure Container Instances
- Registry: GHCR

Current production routing in the repository:

- `frontend/vercel.json` rewrites `/api/*` and `/uploads/*` to the Azure backend
- frontend code defaults to `/api`

## Backend Runtime Requirements

The backend is an Express application with entry point:

- `backend/src/server.js`

Runtime command:

```bash
node src/server.js
```

Container runtime facts:

- Base image: `node:20-alpine`
- Exposed port: `5000`
- Bind address: `0.0.0.0`
- Health endpoint: `/health`
- Metrics endpoint: `/metrics`

## Required Backend Environment Variables

Required:

- `MONGO_URI` or `MONGODB_URI`
- `JWT_SECRET`

Recommended:

- `PORT=5000`

Optional feature variables:

- `INSTAPAY_RECEIVER_NUMBER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`
- `OPENROUTER_MODEL` or `ANTHROPIC_MODEL`
- `GROQ_API_KEY`
- `GROQ_STT_MODEL`
- `FFMPEG_PATH` optional override if deployment uses system ffmpeg instead of bundled `ffmpeg-static`

AI interview deployment notes:

- Backend extracts audio locally from uploaded interview video before calling Groq STT.
- Default implementation uses bundled `ffmpeg-static` binary.
- On platforms where bundled binary is unsupported, install FFmpeg in image and set `FFMPEG_PATH`.
- Original video remains stored even when extraction/STT/evaluation fails.

## Build and Push Images

### Backend

Build the Azure-compatible backend image:

```bash
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t ghcr.io/mo7amed7osam/shaghalny/backend:latest \
  --push ./backend
```

### Frontend

Build the frontend image with the API base URL baked in:

```bash
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --build-arg VITE_API_URL=/api \
  -t ghcr.io/mo7amed7osam/shaghalny/frontend:latest \
  --push ./frontend
```

Important:

- `buildcache` is not a runtime image tag
- `buildcache` is only used by GitHub Actions as a Buildx cache reference
- deploy `latest`, a branch tag, or a SHA tag produced by the CD workflow

## GHCR Authentication

Login locally:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u mo7amed7osam --password-stdin
```

Azure Container Instances also needs registry credentials when the package is private.

## Azure Container Instances

### Create Resource Group

```bash
az group create --name gradproject-rg --location francecentral
```

### Deploy the Backend Container

```bash
az container create \
  --resource-group gradproject-rg \
  --name gradproject-back \
  --os-type Linux \
  --cpu 1 \
  --memory 1.5 \
  --image ghcr.io/mo7amed7osam/shaghalny/backend:latest \
  --registry-login-server ghcr.io \
  --registry-username mo7amed7osam \
  --registry-password "$GHCR_TOKEN" \
  --dns-name-label gradproject-back-1776705847 \
  --ip-address Public \
  --ports 5000 \
  --environment-variables \
    PORT=5000 \
    MONGO_URI="$MONGO_URI" \
    JWT_SECRET="$JWT_SECRET"
```

### Useful Azure Commands

Show current state:

```bash
az container show \
  --resource-group gradproject-rg \
  --name gradproject-back \
  --query "{state:instanceView.state,fqdn:ipAddress.fqdn,ip:ipAddress.ip}" \
  -o json
```

Read logs:

```bash
az container logs \
  --resource-group gradproject-rg \
  --name gradproject-back
```

Show recent events:

```bash
az container show \
  --resource-group gradproject-rg \
  --name gradproject-back \
  --query "containers[0].instanceView.events" \
  -o table
```

## Vercel Frontend

The repository currently uses `frontend/vercel.json` rewrites so the browser can call `/api` over HTTPS while Vercel proxies traffic to the Azure backend.

Key rule:

- `VITE_API_URL` should be `/api`, or left unset so the frontend default is `/api`

Do not set the frontend to call the Azure backend HTTP URL directly in the browser.

## Docker Compose Deployment

For a local or VM-based deployment that uses MongoDB Atlas, create a root `.env` with `MONGO_URI` and then run:

```bash
docker compose up -d --build
```

This starts:

- backend on host `${BACKEND_PORT:-5000}`
- frontend on host `80`

The backend connects to the MongoDB cluster defined in `MONGO_URI`.

## Monitoring

Local monitoring stack:

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Monitoring endpoints:

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Loki: `http://localhost:3100`

Full monitoring details: [monitoring/README.md](monitoring/README.md)

## Deployment Checklist

- Use a real runtime image tag, not `buildcache`
- Build backend for `linux/amd64`
- Set `PORT=5000`
- Set `MONGO_URI` or `MONGODB_URI`
- Set a real `JWT_SECRET`
- Confirm the backend answers `/health`
- Confirm the frontend is using `/api`
- Confirm Azure can authenticate to GHCR if the package is private
