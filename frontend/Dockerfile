# Build Stage
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

# Install dependencies including legacy peer deps
RUN npm install --legacy-peer-deps

COPY . .

# Build the app
RUN npm run build

# Production Stage
FROM nginx:alpine

# Install OpenSSL
RUN apk add --no-cache openssl curl

# Create SSL directory and generate self-signed certificate
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
