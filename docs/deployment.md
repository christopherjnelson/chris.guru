# Deployment

This document describes the deployment model for the Autonomous Portfolio CMS.

## Current State

### Development Workflow

1. Development occurs locally
2. Changes are pushed to GitHub (`main` branch)
3. The DigitalOcean droplet pulls from GitHub and deploys

### Deployment Process

- **Platform**: DigitalOcean droplet
- **User**: `deploy` (dedicated non-human user with limited sudo access)
- **Trigger**: GitHub Action on push to `main`
- **Method**: The GitHub Action uses `appleboy/ssh-action` to SSH into the droplet and execute `/home/deploy/deploy-cms.sh`
- **Deploy script**: `/home/deploy/deploy-cms.sh` — pulls latest code, installs dependencies, builds, and restarts the Node server via systemd
- **Process management**: systemd service (`portfolio.service`)

### GitHub Action

The workflow file at `.github/workflows/deploy.yml`:
1. Triggers on push to `main`
2. SSHs into the droplet using secrets (`DROPLET_IP`, `DROPLET_USER`, `SSH_PRIVATE_KEY`)
3. Passes `N8N_HEALTH_WEBHOOK` from GitHub Actions secrets and executes `/home/deploy/deploy-cms.sh`

### Directory Structure

```text
/home/deploy/
├── apps/
│   └── autonomous-portfolio/
│       ├── CMS/
│       ├── workflows/
│       ├── docs/
│       └── .github/
└── deploy-cms.sh
```

### systemd Service

```ini
# /etc/systemd/system/portfolio.service
[Unit]
Description=Autonomous Portfolio CMS (Astro SSR)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/apps/autonomous-portfolio/CMS
ExecStart=/usr/bin/node ./dist/server/entry.mjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/home/deploy/apps/autonomous-portfolio/CMS/.env

[Install]
WantedBy=multi-user.target
```

The production `CMS/.env` defines `N8N_CHAT_WEBHOOK` for chat requests. The
dedicated `N8N_HEALTH_WEBHOOK` is stored as a GitHub Actions repository secret
and passed to the remote build by the deployment workflow. Astro embeds the
health URL during `npm run build`, so the workflow fails before deployment when
the secret is absent.

### Deploy Script

```bash
#!/bin/bash
# /home/deploy/deploy-cms.sh
set -euo pipefail

APP_DIR="/home/deploy/apps/autonomous-portfolio"
cd "$APP_DIR"

git pull origin main
cd CMS
npm ci
npm run build
sudo systemctl restart portfolio
```

### sudoers Entry

The `deploy` user is only allowed to restart the portfolio service — no general sudo:

```text
# /etc/sudoers.d/deploy-portfolio
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart portfolio
```

### Nginx Configuration

The Astro Node server runs behind an Nginx reverse proxy. The server listens on `0.0.0.0:4321` by default, and Nginx proxies HTTP traffic to it.

```nginx
server {
    listen 80;
    server_name chris.guru;

    location / {
        proxy_pass         http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

---

## Manual Deployment

If the GitHub Action is unavailable, deploy manually by SSHing into the droplet:

```bash
ssh deploy@<droplet-ip>
/home/deploy/deploy-cms.sh
