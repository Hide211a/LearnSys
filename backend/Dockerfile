FROM node:20-bookworm-slim

WORKDIR /app

# Prisma schema must exist before npm ci (postinstall runs prisma generate).
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "dist/index.js"]
