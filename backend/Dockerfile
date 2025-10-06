# Multi-stage build for production

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY backend ./backend
COPY tsconfig.json ./

# Build TypeScript
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --workspace=backend --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/knexfile.ts ./backend/
COPY --from=builder /app/backend/src/db/migrations ./backend/src/db/migrations

# Create necessary directories
RUN mkdir -p /app/backend/uploads /app/backend/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "backend/dist/index.js"]
