FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=1

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm --version && pnpm install --frozen-lockfile --reporter=append-only

FROM deps AS build
COPY . .
ENV NODE_ENV=development
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/docs ./docs

EXPOSE 3000
CMD ["node", "dist/index.js"]
