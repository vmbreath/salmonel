FROM node:22-bookworm-slim
WORKDIR /app
COPY app/package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force
COPY app/ ./
USER node
CMD ["node","server.js"]
