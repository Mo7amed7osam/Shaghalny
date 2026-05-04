FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

RUN mkdir -p /app/uploads /app/private/topups \
  && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
