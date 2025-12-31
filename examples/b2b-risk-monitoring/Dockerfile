# Reclapp B2B Risk Monitoring API
# Multi-stage build for production

# ===========================================================================
# Stage 1: Build
# ===========================================================================
FROM node:20-alpine AS builder

WORKDIR /app/examples/b2b-risk-monitoring

# Install dependencies
COPY examples/b2b-risk-monitoring/package*.json ./
RUN npm install

# Copy source
COPY examples/b2b-risk-monitoring/tsconfig.json ./
COPY examples/b2b-risk-monitoring/src/ ./src/

# Build
RUN npm run build

# ===========================================================================
# Stage 2: Production
# ===========================================================================
FROM node:20-alpine AS production

WORKDIR /app/examples/b2b-risk-monitoring

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reclapp -u 1001

# Install only production dependencies
COPY examples/b2b-risk-monitoring/package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy built files
COPY --from=builder /app/examples/b2b-risk-monitoring/dist ./dist
COPY examples/b2b-risk-monitoring/contracts/ ./contracts/

# Set ownership
RUN chown -R reclapp:nodejs /app/examples/b2b-risk-monitoring

USER reclapp

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

# Start
CMD ["node", "dist/server.js"]
