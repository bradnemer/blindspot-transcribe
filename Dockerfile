# Podcast Manager - Production Dockerfile
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci --include=dev
COPY . .
EXPOSE 5173 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci --include=dev
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache sqlite

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/dist-server ./dist-server
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.env.production ./.env

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Create necessary directories
RUN mkdir -p logs benchmark-results /app/data && \
    chown -R nextjs:nodejs logs benchmark-results /app/data

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/api/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["npm", "run", "start"]