# Use Node.js LTS version
FROM node:18-alpine

# Install curl for health checks and sqlite for database debugging
RUN apk --no-cache add curl sqlite

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install all dependencies (including dev) for build
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Copy SQL files
RUN mkdir -p dist/database && cp src/database/schema.sql dist/database/

# Remove dev dependencies after build
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]