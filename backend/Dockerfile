# Use full Node 20 image which includes curl and other utilities
FROM node:20

# Set working directory
WORKDIR /app

# PostgreSQL client is usually not pre-installed, but let's see if we can live without it 
# or if it installs faster on the full image context.
# Removing for now to bypass DNS lag.

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nodejs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
