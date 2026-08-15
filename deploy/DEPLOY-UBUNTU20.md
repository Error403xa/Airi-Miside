# AIRI Ubuntu 20 Deployment

Server IP: `45.150.226.76`

## 1. Upload and extract

Upload the archive into `/opt/Airi`, then:

```bash
cd /opt/Airi
tar -xzf airi-deploy-src.tar.gz
cd airi
```

## 2. Install runtime dependencies

```bash
sudo apt update
sudo apt install -y curl ca-certificates docker.io docker-compose-plugin
sudo systemctl enable --now docker

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
```

## 3. Configure environment

Create `apps/server/.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:change-this-password@db:5432/postgres
API_SERVER_URL=http://45.150.226.76:4821

AUTH_GOOGLE_CLIENT_ID=change-me
AUTH_GOOGLE_CLIENT_SECRET=change-me
AUTH_GITHUB_CLIENT_ID=change-me
AUTH_GITHUB_CLIENT_SECRET=change-me
```

Create `apps/stage-web/.env.production`:

```dotenv
VITE_SERVER_URL=http://45.150.226.76:4821
```

## 4. Build web

```bash
pnpm install --frozen-lockfile
pnpm -F @proj-airi/stage-web build
```

## 5. Start services

```bash
cd deploy
sudo docker compose -f docker-compose.deploy.yml up -d --build
```

## 6. Verify

```bash
curl http://127.0.0.1:4821/health
```
