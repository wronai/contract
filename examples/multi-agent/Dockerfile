# Reclapp Multi-Agent
# Configurable agent build

ARG AGENT_TYPE=orchestrator

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY contracts/ ./contracts/
COPY agents/ ./agents/

RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

ARG AGENT_TYPE
ENV AGENT_TYPE=${AGENT_TYPE}

WORKDIR /app

# Security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/agents ./agents

RUN chown -R reclapp:nodejs /app

USER reclapp

ENV NODE_ENV=production

EXPOSE 8080 8081 8082 8083

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Start specific agent based on AGENT_TYPE
CMD ["sh", "-c", "node dist/agents/${AGENT_TYPE}/index.js"]
