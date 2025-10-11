# Use Node.js 20 (compatible with all dependencies)
FROM node:20-alpine

WORKDIR /app

# Copy only server files to avoid workspace issues
COPY server/package*.json ./
COPY server/ ./

# Install dependencies with npm (not yarn)
RUN npm install --only=production

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]