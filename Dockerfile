# Single-service image: builds the website and serves it from the API server.
# Works on Render, Railway, Fly.io, Google Cloud Run, AWS App Runner or any VPS.
#   docker build -t pgdrisya .
#   docker run -p 5000:5000 --env-file server/.env pgdrisya
# The website is served at the same address as the API, so CORS_ORIGINS is optional.

FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --ignore-scripts
COPY client/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=5000 \
    CLIENT_DIST=/app/client/dist
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server/src ./src
COPY --from=client /app/client/dist /app/client/dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "src/server.js"]
