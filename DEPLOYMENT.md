# Telemetry Platform Deployment Guide

This project is configured as a unified repository containing both the Vite/React frontend and the Node.js/Express backend. To simplify hosting, the backend Express server is configured to serve the compiled frontend static files, meaning you only need to deploy **one** application instance.

## Option 1: Deploy on Render.com (Recommended)

Render can automatically build and deploy this unified repository using the root `Dockerfile`.

### 1. Set up the Database
1. Go to your [Render Dashboard](https://dashboard.render.com/) and create a new **PostgreSQL** database.
2. Choose a name (e.g., `telemetry-db`) and create it.
3. Once deployed, copy the **Internal Database URL** (if deploying the web service on Render) or **External Database URL**.

### 2. Set up the Web Service
1. Create a new **Web Service** on Render.
2. Connect this GitHub repository (`darthdragneel1/RemotePatientMonitoring`).
3. Render will automatically detect the root `Dockerfile` and select **Docker** as the environment.
4. Expand the **Advanced** section to add your Environment Variables (see the reference below).
5. Click **Create Web Service**.

Render will build the frontend, build the backend, run your Prisma database migrations, and start the unified server.

### Environment Variables Reference
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | The PostgreSQL connection string | `postgresql://user:pass@host/db?schema=public` |
| `JWT_SECRET` | A secure random string for signing auth tokens | `super-secret-random-string` |
| `INGEST_API_KEY_NAME` | Header name expected by MioConnect | `x-mioconnect-key` |
| `INGEST_API_KEY_VALUE` | Secure API key for MioConnect to authenticate | `generate-a-secure-key-here` |
| `FRONTEND_URL` | Optional, used for CORS overrides (defaults to the origin) | `https://your-render-app.onrender.com` |

---

## Option 2: Docker Compose (Self-Hosted / VPS)

If you prefer to host this on a Virtual Private Server (VPS) like DigitalOcean, AWS EC2, or your local machine, you can use the provided `docker-compose.yml`.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed.
- [Docker Compose](https://docs.docker.com/compose/install/) installed.

### Running the Stack
1. Clone this repository onto your server.
2. From the root directory, run:
   ```bash
   docker-compose up -d --build
   ```
3. The application will be exposed on port `3000` (Frontend) and `4000` (Backend API). *Note: The `docker-compose.yml` uses separate containers for frontend (Nginx) and backend for modularity in self-hosted environments.*

### Seeding the Database
On a fresh install, your database will be empty. To seed the initial `SUPER_ADMIN` and test accounts, run:
```bash
docker-compose exec backend npx prisma db seed
```
You can then log in using `admin@telemetry.dev` and password `password123`.

### Stopping the Stack
To stop the application (while preserving database data):
```bash
docker-compose down
```
