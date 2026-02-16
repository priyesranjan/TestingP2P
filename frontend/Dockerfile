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

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
