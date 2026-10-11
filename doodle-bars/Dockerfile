FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_OPTIONS=--conditions=react-server
ENV RIVET_PORT=6420

CMD ["npx", "tsx", "runner.ts"]
