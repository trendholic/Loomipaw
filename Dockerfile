# syntax=docker/dockerfile:1
# =====================================================================
# Loomipaw — production image (multi-stage)
# =====================================================================

# ---- Builder: install production deps (native modules use prebuilt binaries) ----
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Only production dependencies end up in the runtime image.
RUN npm ci --omit=dev && npm cache clean --force

# ---- Runtime: slim image, non-root ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

# Tini for correct signal handling (graceful shutdown).
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY public ./public

# Runtime data lives on a mounted volume; create + own the mount points.
RUN mkdir -p data uploads/products var/logs var/mail \
    && chown -R node:node /app
USER node

EXPOSE 4000
VOLUME ["/app/data", "/app/uploads", "/app/var"]

# Container healthcheck hits the app's health endpoint.
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||4000) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrate on boot (idempotent), then start.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "node server/db/migrate.js && node server/index.js"]
