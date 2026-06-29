# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Only production deps in the final image.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Compiled app + the migration SQL the app runs on boot.
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
# Apply pending migrations, then start the server. (For multi-instance setups,
# move the migrate step to a one-off release command instead.)
CMD ["npm", "run", "start:prod"]
