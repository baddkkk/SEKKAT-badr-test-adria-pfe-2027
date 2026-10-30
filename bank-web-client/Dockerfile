# ── Stage 1: Build Angular app ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ────────────────────────────────
FROM nginx:alpine AS production

# Remove default nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist/bank-web-client/browser /usr/share/nginx/html

# Custom nginx config for Angular routing + API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
