FROM node:24-trixie AS build-stage

WORKDIR /app

RUN apt update && apt install -y ca-certificates curl
RUN update-ca-certificates
RUN apt update && apt install -y build-essential python3 python3-setuptools curl

RUN corepack enable

COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

RUN pnpm -F @proj-airi/stage-web run build && \
    pnpm -F @proj-airi/docs run build:base && \
    mv ./docs/.vitepress/dist ./apps/stage-web/dist/docs && \
    pnpm -F @proj-airi/stage-ui run story:build && \
    mv ./packages/stage-ui/.histoire/dist ./apps/stage-web/dist/ui

FROM node:24-trixie AS production-stage

WORKDIR /app

RUN apt update && apt install -y --no-install-recommends \
    android-tools-adb \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=build-stage /app /app

RUN python3 -m pip install --break-system-packages -r ./Open-AutoGLM-main/Open-AutoGLM-main/requirements.txt

ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80

CMD ["pnpm", "-F", "@proj-airi/stage-web", "start"]
