# Stage 1: Build the application
FROM node:18-slim AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY . .

# Clean any existing build artifacts
RUN rm -rf dist

# Build TypeScript code
RUN npm run build

# Stage 2: Production image
FROM node:18-slim AS production

WORKDIR /usr/src/app

# Set NODE_ENV to production
ENV NODE_ENV=production
# ENV PORT=3001 # Already defaulted in index.ts, but can be set here

# Copy built application and production dependencies from builder stage
COPY --from=builder /usr/src/app/dist ./dist/
COPY --from=builder /usr/src/app/node_modules ./node_modules/
COPY --from=builder /usr/src/app/package.json ./

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "dist/index.js"]
