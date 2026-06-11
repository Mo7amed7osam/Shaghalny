# Shaghalny

[![CI Pipeline](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/ci.yml/badge.svg)](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/cd.yml/badge.svg)](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/cd.yml)
[![PR Checks](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/Mo7amed7osam/Shaghalny/actions/workflows/pr-checks.yml)

Shaghalny is a student-focused freelancing marketplace built with a React frontend and an Express/MongoDB backend. The platform supports job posting, proposals, admin review flows, video-based skill verification, AI-driven cover letter improvement, AI career roadmaps, real-time events/notifications, and includes Progressive Web App (PWA) offline capabilities for mobile users.

## Documentation

- [Quick Start](QUICKSTART.md)
- [Deployment Guide](DEPLOYMENT.md)
- [CI/CD Guide](CICD.md)
- [CI/CD Summary](CI-CD-SUMMARY.md)
- [Monitoring Guide](monitoring/README.md)
- [Contributing](CONTRIBUTING.md)
- [Testing](TESTING.md)
- [Security](SECURITY.md)

## Architecture

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT
- Containerization: Docker and Docker Compose
- Image Registry: GitHub Container Registry
- Frontend Hosting: Vercel
- Backend Hosting: Azure Container Instances
- Monitoring: Grafana, Prometheus, Loki, Promtail, Blackbox Exporter, Alertmanager

## Repository Layout

```text
.
├── ai-interview/             # Auxiliary Python AI interview tooling
├── backend/                  # Express API
├── frontend/                 # Vite React application
├── monitoring/               # Prometheus, Grafana, Loki, Alertmanager config
├── .github/workflows/        # CI, CD, PR, dependency automation
├── docker-compose.yml        # Local application stack
├── docker-compose.monitoring.yml
└── *.md                      # Project documentation
```

The `ai-interview/` directory contains separate Python-based interview, voice, STT, and camera-monitoring experiments that are not part of the main Docker Compose marketplace stack.

## Local Development

### Option 1: Docker Compose

Create a root `.env` file, then start the full local stack:

```bash
docker compose up -d
```

Default local endpoints:

- Frontend: `http://localhost`
- Backend: `http://localhost:5000`
- Backend health: `http://localhost:5000/health`
- MongoDB: `mongodb://localhost:27017`

Stop the stack:

```bash
docker compose down
```

### Option 2: Run Services Manually

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Manual development endpoints:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Required Configuration

There is no committed `.env.example` file in this repository. Create your own `.env` values based on the application needs.

Minimum backend variables:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=change-this-in-real-environments
PORT=5000
```

Additional backend variables used by optional features:

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
- `FFMPEG_PATH` optional override for local audio extraction binary

AI interview processing notes:

- Main app stores original uploaded video.
- Backend extracts temporary WAV audio locally with FFmpeg before sending audio to Groq STT.
- `ffmpeg-static` is used by default in Node environments that support its bundled binary.
- If your deployment image already has FFmpeg installed, set `FFMPEG_PATH` to that binary path.
- If audio extraction, STT, or AI evaluation fails, interview answer is stored with `needs_review` and a clear processing note instead of a fake score.

Frontend build-time variable:

- `VITE_API_URL`

The frontend defaults to `/api` when `VITE_API_URL` is not set.

## Production Topology

The current production setup reflected in this repository is:

- Frontend deployed on Vercel
- Backend deployed on Azure Container Instances
- Frontend API traffic proxied through `frontend/vercel.json`
- Backend container image published to GHCR

Important production notes:

- The backend image must be built for `linux/amd64` for Azure Container Instances.
- The backend runtime image tag is `latest` or a SHA-based runtime tag, not `buildcache`.
- The backend listens on `0.0.0.0:5000`.
- The frontend should call `/api`, not the backend Azure HTTP URL directly, to avoid mixed-content problems in the browser.

## Monitoring

The repository includes a full local monitoring stack in `docker-compose.monitoring.yml`.

Once started, local monitoring endpoints are:

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Loki: `http://localhost:3100`
- Blackbox Exporter: `http://localhost:9115`

Full details: [monitoring/README.md](monitoring/README.md)

## Current CI/CD Behavior

- CI runs on push and pull request for `main` and `develop`
- CI uses Node `20.x`
- CD builds only the changed service image on pushes to `main`
- Docker images are published to GHCR
- CD uses `buildcache` only for layer caching, not as a deployable image tag
- Frontend Docker builds can consume `VITE_API_URL` from a GitHub Actions repository variable

Full details: [CICD.md](CICD.md)
