# Multi-stage build for optimal image size and security
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy application sources
COPY . .

# Build Vite frontend and bundled server.cjs via esbuild
RUN npm run build

# -------------------------------------------------------------
# Production runner image
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/app/data/parental_lock_data.json

# Install curl for container health check
RUN apk add --no-cache curl

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy built production assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create directory for persistent state volume and grant permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Run under non-root node user for container security
USER node

# Persistent volume for settings, quiz results and lock state
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
