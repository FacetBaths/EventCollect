# Use Node.js 20 (compatible with all dependencies)
FROM node:20-alpine

# curl is needed for the health check probe
RUN apk add --no-cache curl

WORKDIR /app

# Copy only server files to avoid workspace issues
COPY server/package*.json ./
COPY server/ ./

# Install all dependencies (including dev deps for build)
RUN yarn install --frozen-lockfile || yarn install

# Build the application
RUN yarn build

# Remove dev dependencies for a leaner production image
RUN yarn install --production --ignore-scripts

# Expose the default port (Railway overrides via PORT env var)
EXPOSE 3001

# Railway manages health checks via railway.toml (healthcheckPath = "/api/health")
# No Docker-level HEALTHCHECK needed — Railway's own probe handles this.

# Start the application
CMD ["node", "dist/index.js"]
