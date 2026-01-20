# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Build arguments
ARG BUILD_DATE
ARG VERSION
ARG BUILD_TIMESTAMP

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Set build-time environment variables for Vite
ENV VITE_BUILD_DATE=$BUILD_DATE
ENV VITE_APP_VERSION=$VERSION
ENV VITE_BUILD_ID=$BUILD_TIMESTAMP

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install curl for health checks
RUN apk --no-cache add curl

# Copy built app to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions for nginx user (already exists in base image)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]