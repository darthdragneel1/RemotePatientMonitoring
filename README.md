# Remote Patient Monitoring (RPM) Telemetry Platform

A complete, multi-tenant dashboard and API for managing and viewing device telemetry data. The platform allows organizations to log in and monitor their patients and linked devices, while Super Admins can manage organizations and user invitations.

This repository is a **unified monorepo** containing both the Frontend (React/Vite) and the Backend (Node.js/Express) applications.

## Key Features

- **Multi-Tenant Architecture**: Strict data isolation. Users only see patients, devices, and telemetry associated with their own organization.
- **Super Admin Capabilities**: Global overview, organization creation, and user invite management.
- **Device Telemetry Ingestion**: A robust set of webhooks designed to receive payload data (telemetry, status, heartbeat) forwarded from **MioConnect** (Lifesense/Transtek devices like BP monitors, scales, pulse oximeters, etc.).
- **Modern Tech Stack**: 
  - **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Base UI, TanStack Query.
  - **Backend**: Node.js, Express 5, Prisma ORM, PostgreSQL.
- **Unified Deployment**: The backend Express server handles both the API routes and the serving of the compiled static frontend files, making deployment to a single server or cloud instance incredibly easy.

## Project Structure

- `/Frontend/`: Contains the React SPA, components, and client-side routing.
- `/Backend/`: Contains the Express API, Prisma schemas, database migrations, and MioConnect webhook handlers.
- `Dockerfile`: A unified multi-stage Dockerfile that builds the frontend, builds the backend, and combines them for production deployment.
- `docker-compose.yml`: A complete self-hosted orchestration setup including the PostgreSQL database.

## Local Development

You can run the frontend and backend separately for local development to take advantage of hot-reloading (HMR).

### Prerequisites
- Node.js (v20+)
- PostgreSQL 16 (running locally)

### 1. Backend Setup
```bash
cd Backend
npm install
cp .env.example .env # Ensure DATABASE_URL is set correctly
npx prisma migrate dev
npx prisma db seed # Seeds test users and organizations
npm run dev # Starts on http://localhost:4000
```

### 2. Frontend Setup
In a new terminal window:
```bash
cd Frontend
npm install
cp .env.example .env # VITE_API_URL should point to http://localhost:4000
npm run dev # Starts on http://localhost:5173
```

### Test Credentials (from Seed Data)
- **Super Admin**: `admin@telemetry.dev` (Password: `password123`)
- **Org User**: `user@acme.dev` (Password: `password123`)

## Deployment

The application is architected to deploy as a **single unified instance** on modern hosting platforms (like Render) or via a single `docker-compose` stack on a Virtual Private Server (VPS). 

For complete, step-by-step instructions on deploying the platform, please see the [DEPLOYMENT.md](./DEPLOYMENT.md) guide.
