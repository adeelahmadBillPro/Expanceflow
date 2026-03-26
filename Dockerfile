FROM node:22-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy server code
COPY server/ ./server/

# Copy built client to server for serving
RUN cp -r client/dist server/public

# Generate Prisma Client
RUN cd server && npx prisma generate

EXPOSE 5000

WORKDIR /app/server
CMD ["node", "src/index.js"]
