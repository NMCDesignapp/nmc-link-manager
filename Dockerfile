# Cloud Run staging image for KPI standalone only.
# Build context MUST be the repository root because kpi-app build scripts
# synchronize sources and assets from ../src, ../public and ../scripts.
FROM node:22-bookworm-slim AS builder

WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npm ci --prefix kpi-app
RUN npm run build --prefix kpi-app

FROM node:22-bookworm-slim AS runtime

WORKDIR /workspace/kpi-app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /workspace/kpi-app/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/kpi-app/.next ./.next
COPY --from=builder --chown=node:node /workspace/kpi-app/public ./public
COPY --from=builder --chown=node:node /workspace/kpi-app/prisma ./prisma
COPY --from=builder --chown=node:node /workspace/kpi-app/package.json ./package.json
COPY --from=builder --chown=node:node /workspace/kpi-app/next.config.ts ./next.config.ts

USER node
EXPOSE 8080
CMD ["sh", "-c", "node ./node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port ${PORT:-8080}"]
