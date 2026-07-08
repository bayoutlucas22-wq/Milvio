FROM node:20 AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
COPY index.html vite.config.js postcss.config.cjs ./
COPY src ./src
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM base AS build
COPY index.html vite.config.js postcss.config.cjs ./
COPY src ./src
RUN npm run build

FROM node:20 AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
