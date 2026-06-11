# Contributing

Thank you for contributing to Shaghalny.

This document explains how to work on the repository without fighting the current project setup.

## Prerequisites

- Node.js `20.x`
- npm
- Docker Desktop
- Git

## Repository Setup

Clone the repository:

```bash
git clone https://github.com/Mo7amed7osam/Shaghalny.git Shaghalny
cd Shaghalny
```

There is no committed `.env.example` file. Create your own root `.env` with the values required for the services you want to run.

Minimum backend values:

```env
MONGO_URI=your-mongo-uri
JWT_SECRET=local-dev-secret
PORT=5000
```

## Running the Project

### Docker Compose

```bash
docker compose up -d
```

### Manual Backend

```bash
cd backend
npm install
npm run dev
```

### Manual Frontend

```bash
cd frontend
npm install
npm run dev
```

## Branch Naming

Use descriptive branch names:

- `feature/<name>`
- `fix/<name>`
- `docs/<name>`
- `refactor/<name>`
- `chore/<name>`

Examples:

- `feature/student-notifications`
- `fix/login-error-handling`
- `docs/update-monitoring-guide`

## Commit Messages

Use clear, scoped messages. Conventional commit style is preferred.

Examples:

```text
feat(backend): add metrics endpoint
fix(frontend): route API calls through /api
docs(deployment): update Azure ACI commands
```

## Before Opening a Pull Request

Run the checks that actually exist in this repository.

Backend:

```bash
cd backend
npm ci
npm test -- --passWithNoTests
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Docker validation:

```bash
docker compose config
docker compose -f docker-compose.monitoring.yml config
```

## Pull Request Expectations

Include:

- a clear summary of what changed
- why the change was needed
- any required environment changes
- screenshots for visible frontend changes
- deployment notes when infrastructure or Docker behavior changed

Keep PRs small enough to review. The repository PR workflow warns on very large changes.

## CI Expectations

Current GitHub Actions behavior:

- CI runs on `main` and `develop`
- CD runs on `main`
- PR checks run on pull requests
- builds are path-aware
- Node `20.x` is the standard runtime in CI

Known limitation:

- there is no real lint script configured yet, so do not rely on CI lint jobs as a code-quality gate

## Documentation Changes

If you change:

- deployment behavior
- environment variables
- Dockerfiles
- GitHub Actions
- monitoring config

update the relevant Markdown files in the same PR.

## Security and Secrets

- never commit `.env` files
- never commit keys, tokens, or certificates
- rotate any secret that was exposed outside a secure channel
- use GitHub Security Advisories or private maintainer contact for security issues

Security guide: [SECURITY.md](SECURITY.md)
