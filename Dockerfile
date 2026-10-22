FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npx prisma generate && npm run build
RUN npx esbuild prisma/seed.ts --platform=node --format=esm --outfile=.migrator/catalog-seed.mjs

FROM base AS production-dependencies
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

FROM base AS web
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# The runtime never invokes npm; removing the bundled CLI drops its transitive vulnerabilities.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=production-dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]

FROM base AS migrator
ENV NODE_ENV=production
# The runtime never invokes npm; removing the bundled CLI drops its transitive vulnerabilities.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=production-dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.migrator/catalog-seed.mjs ./catalog-seed.mjs
COPY --chmod=755 scripts/migrate-and-seed.sh ./migrate-and-seed.sh
USER nextjs
ENTRYPOINT ["./migrate-and-seed.sh"]
