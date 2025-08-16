# Use official Node.js runtime as base image
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY .env ./
COPY . .
RUN npm run build
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001
RUN chown -R backend:nodejs /app
USER backend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
CMD ["npm", "start"]