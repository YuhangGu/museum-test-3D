FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build -w @museum/api
USER node
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@museum/api"]
