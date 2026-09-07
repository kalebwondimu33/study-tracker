FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY client/package.json client/pnpm-lock.yaml ./client/

RUN corepack enable && pnpm install --frozen-lockfile && pnpm install --prefix client --frozen-lockfile

COPY . .

RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server/index.js"]
