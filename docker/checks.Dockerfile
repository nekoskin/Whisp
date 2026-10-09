ARG NODE_IMAGE=node:20-bookworm
ARG RUST_IMAGE=rust:1-bookworm

FROM ${NODE_IMAGE} AS frontend
WORKDIR /whisp
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY public public
COPY src src
RUN npm run build

FROM ${RUST_IMAGE} AS checks
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
      librsvg2-dev libssl-dev patchelf python3 \
 && rm -rf /var/lib/apt/lists/*
RUN rustup component add rustfmt clippy
WORKDIR /whisp
COPY . .
COPY --from=frontend /whisp/dist dist
WORKDIR /whisp/src-tauri
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    cargo test --workspace --no-run && cargo clippy --all-targets
WORKDIR /whisp
CMD ["sh", "docker/run-checks.sh"]
