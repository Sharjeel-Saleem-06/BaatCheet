# ===========================================
# BaatCheet Backend - Hugging Face Spaces Dockerfile
# ===========================================
# This Dockerfile is optimized for Hugging Face Spaces
# Free tier: 2 vCPU, 16GB RAM, 50GB storage
# ===========================================

FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    postgresql-client

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY backend/src ./src/
COPY backend/tsconfig.json ./

# Build TypeScript
RUN npm run build || npx tsc

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Expose port (Hugging Face uses 7860 by default)
EXPOSE 7860

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7860/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
