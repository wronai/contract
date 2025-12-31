# Reclapp IoT Monitoring API
# Multi-stage build

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app/examples/iot-monitoring

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY examples/iot-monitoring/package*.json ./
RUN npm install

COPY examples/iot-monitoring/tsconfig.json ./
COPY examples/iot-monitoring/src/ ./src/
COPY examples/iot-monitoring/contracts/ ./contracts/

RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

WORKDIR /app/examples/iot-monitoring

# Security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Production dependencies only
COPY examples/iot-monitoring/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder /app/examples/iot-monitoring/dist ./dist
COPY --from=builder /app/examples/iot-monitoring/contracts ./contracts

RUN chown -R reclapp:nodejs /app/examples/iot-monitoring

USER reclapp

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

CMD ["node", "dist/server.js"]
