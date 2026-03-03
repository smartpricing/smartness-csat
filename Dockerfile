# Base stage: Install pnpm and dependencies required for build
FROM node:lts-alpine AS base
RUN npm i -g pnpm
RUN apk add jq bash
WORKDIR /app
# Copy package.json and pnpm-lock.yaml separately to leverage Docker cache better
COPY pnpm-lock.yaml ./
COPY package.json ./_package.json
# Process package.json to remove the version field
RUN cat _package.json | jq 'del(.version)' > package.json
RUN rm _package.json

# Production dependencies stage
FROM base AS prod-deps
RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc \
  pnpm install --prod --frozen-lockfile

# Build stage
FROM base AS build
RUN --mount=type=secret,id=npmrc,dst=/root/.npmrc \
  pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Final stage
FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
