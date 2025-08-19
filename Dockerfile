# Multi-stage build for React application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include devDeps needed for build)
# Add libc6-compat to avoid esbuild ETXTBSY issues on Alpine
RUN apk add --no-cache libc6-compat && npm ci

# Copy source code
COPY . .

# --- make Vite envs available at build time ---
# TODO: Inject secrets at deploy/runtime instead of build time for security
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
# ----------------------------------------------

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]