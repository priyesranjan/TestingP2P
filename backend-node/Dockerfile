FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache curl
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

COPY . .

EXPOSE 8001

CMD ["npm", "start"]
