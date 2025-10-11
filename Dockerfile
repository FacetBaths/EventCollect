# Use Node.js 20 (compatible with all dependencies)
FROM node:20-alpine

WORKDIR /app

# Copy only server files to avoid workspace issues
COPY server/package*.json ./
COPY server/ ./

# Install all dependencies (including dev deps for build)
RUN yarn install

# Build the application
RUN yarn build

# Remove dev dependencies for production
RUN yarn install --production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]