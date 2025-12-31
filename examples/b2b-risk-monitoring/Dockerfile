# Reclapp B2B Risk Monitoring API
# Multi-stage build for production

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/
COPY contracts/ ./contracts/

# Build
RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/contracts ./contracts

# Set ownership
RUN chown -R reclapp:nodejs /app

USER reclapp

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start
CMD ["node", "dist/server.js"]
