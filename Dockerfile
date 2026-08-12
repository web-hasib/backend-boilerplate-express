# =============================================================================
# Stage 1: deps
# Install only production dependencies. This layer is cached separately so
# that a code-only change does not re-download npm packages.
# =============================================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy manifests first to leverage layer cache
COPY package.json package-lock.json ./

# Install ALL deps (dev + prod) — needed by the build stage
RUN npm ci --ignore-scripts


# =============================================================================
# Stage 2: builder
# Compile TypeScript and generate the Prisma client.
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Bring in node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files required for the build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client (uses the schema in ./prisma/schema.prisma)
RUN node_modules/.bin/prisma generate

# Bundle TypeScript with esbuild → dist/server.js
RUN node_modules/.bin/esbuild src/server.ts --bundle --platform=node --format=esm --outfile=dist/server.js --packages=external



# =============================================================================
# Stage 3: runner  (final image)
# Only the compiled output + production node_modules go into this stage.
# The image never contains source TypeScript, dev tooling, or secrets.
# =============================================================================
FROM node:22-alpine AS runner

# Install dumb-init for correct signal forwarding and zombie-process reaping
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create a dedicated non-root user for the application
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs appuser

# Copy production node_modules
COPY --from=deps    /app/node_modules ./node_modules

# Copy compiled application
COPY --from=builder /app/dist         ./dist

# Copy Prisma schema + generated client (required at runtime for the adapter)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json (Node needs it to resolve "type": "module")
COPY package.json ./

# Ownership — everything under /app belongs to appuser
RUN chown -R appuser:nodejs /app

USER appuser

# Runtime environment defaults (non-secret, non-sensitive)
ENV NODE_ENV=production \
    PORT=5000

EXPOSE 5000

# Health check — hits the root route which returns a 200 JSON response.
# Start period gives Prisma time to connect on cold start.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/ | grep -q '"success":true' || exit 1


# dumb-init as PID 1 ensures SIGTERM/SIGINT are forwarded correctly to Node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
