# syntax=docker/dockerfile:1

# ---- Build Stage ----
FROM oven/bun:1-alpine AS build

WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# ---- Production Stage ----
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Copy only production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Copy application source
COPY --from=build /app/src ./src

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the application port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["bun", "run", "src/index.tsx"]
