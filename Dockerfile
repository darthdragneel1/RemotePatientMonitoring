# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/Backend
COPY Backend/package*.json ./
RUN npm ci
COPY Backend/prisma ./prisma
RUN npx prisma generate
COPY Backend/ ./
RUN npm run build

# Stage 3: Production Server
FROM node:20-alpine
WORKDIR /app/Backend

COPY Backend/package*.json ./
COPY Backend/prisma ./prisma

# Install all dependencies to ensure prisma CLI is available, generate client, then prune devDependencies
RUN npm ci && \
    npx prisma generate && \
    npm prune --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/Backend/dist ./dist

# Copy compiled frontend into backend's public directory
COPY --from=frontend-builder /app/Frontend/dist ./public

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
