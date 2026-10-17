# Local Development Infrastructure

This directory contains the Docker Compose configuration for the local database (`MongoDB`) and queue/cache broker (`Redis`).

## Starting Services with Docker

Ensure Docker Desktop or the Docker daemon is running, then execute:

```bash
# Start MongoDB and Redis in the background
docker compose -f infrastructure/docker/docker-compose.yml up -d

# Verify health status of running services
docker compose -f infrastructure/docker/docker-compose.yml ps
```

### Stopping Services

```bash
# Stop containers without removing persistent data
docker compose -f infrastructure/docker/docker-compose.yml down

# Stop containers and purge volumes
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

---

## Alternative Setup (When Docker Is Unavailable)

If Docker is not installed or unavailable in your local environment, you have two simple alternatives:

### Option A: Local Native Services (Windows / macOS / Linux)

1. **MongoDB**:
   - Download and install [MongoDB Community Edition](https://www.mongodb.com/try/download/community).
   - Ensure the service is active on `localhost:27017` (default port).
   - Test connectivity: `mongosh --eval "db.runCommand({ ping: 1 })"`
2. **Redis**:
   - On Windows: Download the native MSI or run via WSL2 (`sudo apt install redis-server && sudo service redis-server start`).
   - On macOS: `brew install redis && brew services start redis`
   - Test connectivity: `redis-cli ping` (should output `PONG`).

### Option B: Cloud Developer Tiers (Remote URI)

1. **MongoDB Atlas**:
   - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
   - Update `MONGODB_URI` in `.env` with your connection string:
     ```bash
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/whatsapp_saas_dev?retryWrites=true&w=majority
     ```
2. **Upstash Redis**:
   - Create a free database on [Upstash](https://upstash.com/).
   - Update `REDIS_URL` in `.env`:
     ```bash
     REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379
     ```

### Standalone Demo Mode (No Database Running)

In Phase 1, the frontend dashboard and API health liveness probe (`/api/v1/health`) are designed to run even if MongoDB or Redis are not currently started!
- `GET /api/v1/health` will return `200 OK` (liveness probe).
- `GET /api/v1/health/ready` will accurately report `503 Service Unavailable` with `database: disconnected` (readiness probe).
- The web dashboard will automatically display `Demo Mode (Active)` without failing.
