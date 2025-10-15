# Multi-stage Dockerfile for Node.js (production)
# Builds a minimal production image for the Express app in this repo.

### Build stage: install production dependencies
FROM node:20-alpine AS builder
WORKDIR /

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only (if you want dev deps for a dev image, change this step)
RUN npm install --production --no-audit --no-fund

### Final stage: copy runtime files
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Copy only the files we need from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

# Set a sane production env
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app listens on (index.js uses process.env.PORT || 3000)
EXPOSE 3000

# Start the app with node (do not use nodemon in production)
CMD ["node", "index.js"]

# To build: docker build -t image-caption-generator:latest .
# To run:  docker run --rm -p 3000:3000 --env-file .env image-caption-generator:latest