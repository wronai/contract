# Reclapp Multi-Agent
# Configurable agent build

ARG AGENT_TYPE=orchestrator

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app/examples/multi-agent

COPY examples/multi-agent/package*.json ./
RUN npm install

COPY examples/multi-agent/tsconfig.json ./
COPY examples/multi-agent/src/ ./src/
COPY examples/multi-agent/contracts/ ./contracts/
COPY examples/multi-agent/agents/ ./agents/

RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

ARG AGENT_TYPE
ENV AGENT_TYPE=${AGENT_TYPE}

WORKDIR /app/examples/multi-agent

# Security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Production dependencies
COPY examples/multi-agent/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/examples/multi-agent/dist ./dist
COPY --from=builder /app/examples/multi-agent/contracts ./contracts
COPY --from=builder /app/examples/multi-agent/agents ./agents

RUN chown -R reclapp:nodejs /app/examples/multi-agent

USER reclapp

ENV NODE_ENV=production

EXPOSE 8080 8081 8082 8083

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '8080') + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

# Start specific agent based on AGENT_TYPE
CMD ["sh", "-c", "node dist/agents/${AGENT_TYPE}/index.js"]
