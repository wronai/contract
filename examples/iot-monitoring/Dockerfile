# Reclapp IoT Monitoring API
# Multi-stage build

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY contracts/ ./contracts/

RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/contracts ./contracts

RUN chown -R reclapp:nodejs /app

USER reclapp

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
