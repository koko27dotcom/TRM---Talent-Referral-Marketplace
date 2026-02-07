# =============================================================================
# TRM (Talent Referral Marketplace) - Multi-Stage Dockerfile
# =============================================================================
# Stage 1: Dependencies - Install npm dependencies
# Stage 2: Build - Build the React frontend
# Stage 3: Production - Copy built assets and run server
# =============================================================================

# =============================================================================
# STAGE 1: Dependencies
# =============================================================================
FROM node:20-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# =============================================================================
# STAGE 2: Build
# =============================================================================
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy dependencies from stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# =============================================================================
# STAGE 3: Production
# =============================================================================
FROM node:20-alpine AS production

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets from build stage
COPY --from=build /app/dist ./dist

# Copy server files (force fresh copy, no cache)
COPY --chmod=755 server ./server
COPY server.cjs ./

# Copy environment template (will be overridden by docker-compose or K8s secrets)
COPY .env.example ./.env 2>/dev/null || true

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check endpoint (using /health which is available in both servers)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server (using the full-featured server)
CMD ["node", "server/server.js"]
