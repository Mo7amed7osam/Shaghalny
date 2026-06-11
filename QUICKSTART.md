# Quick Start

This guide gets Shaghalny running locally with the smallest possible setup.

## Prerequisites

- Docker Desktop with Compose support
- Git

Optional for manual development:

- Node.js `20.x`
- npm

## Fastest Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Mo7amed7osam/Shaghalny.git Shaghalny
cd Shaghalny
```

### 2. Create a Root `.env`

There is no committed `.env.example` file, so create `.env` yourself.

Minimum local values:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=local-dev-secret
BACKEND_PORT=5000
NODE_ENV=production
INSTAPAY_RECEIVER_NUMBER=01146370900
```

### 3. Start the Application Stack

```bash
docker compose up -d
```

### 4. Verify It Works

```bash
docker compose ps
curl http://localhost:5000/health
```

Expected local endpoints:

- Frontend: `http://localhost`
- Backend: `http://localhost:5000`
- MongoDB: your Atlas cluster from `MONGO_URI`

## Manual Development

Use this if you want hot reload without Docker.

### Backend

```bash
cd backend
npm install
PORT=5000 MONGO_URI='your-mongo-uri' JWT_SECRET='local-dev-secret' npm run dev
```

### Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:5000/api npm run dev
```

## Useful Commands

Start local stack:

```bash
docker compose up -d
```

Follow logs:

```bash
docker compose logs -f
```

Follow one service:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

Stop the stack:

```bash
docker compose down
```

Remove containers and volumes:

```bash
docker compose down -v
```

Rebuild after code or Dockerfile changes:

```bash
docker compose up -d --build
```

## Troubleshooting

### Backend Does Not Start

Check:

- `MONGO_URI` or `MONGODB_URI` is set
- MongoDB container is healthy
- Port `5000` is not already taken

Useful commands:

```bash
docker compose ps
docker compose logs backend
docker compose logs mongodb
```

### Frontend Cannot Reach the API

For local Docker Compose:

- Backend should be available at `http://localhost:5000`
- Frontend is served at `http://localhost`

For manual frontend development:

- set `VITE_API_URL=http://localhost:5000/api`

### Port Conflict

Check what is using the port:

```bash
lsof -i :80
lsof -i :5000
lsof -i :27017
```

### Reset the Local Environment

```bash
docker compose down -v
docker compose up -d --build
```

## Next Steps

- Read [README.md](README.md) for the full project overview
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for GHCR, Azure, and Vercel deployment
- Read [monitoring/README.md](monitoring/README.md) to start Grafana and Prometheus locally
