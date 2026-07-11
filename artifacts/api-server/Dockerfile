FROM node:20-bullseye-slim

# Create app directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy the entire repository (monorepo) to support workspace installs
COPY . /app

# Install dependencies (use --frozen-lockfile to keep deterministic installs)
RUN pnpm install --frozen-lockfile --prod=false

# Build the api-server package
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Expose default port (render will supply PORT env but we expose 4000 as default)
EXPOSE 4000

# Start command
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
