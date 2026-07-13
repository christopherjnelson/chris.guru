# Deployment

This document describes the current and planned deployment models for the Autonomous Portfolio CMS.

## Current State

### Development Workflow

1. Development occurs locally
2. Changes are pushed to GitHub (`main` branch)
3. The DigitalOcean droplet pulls from GitHub and deploys

### Current Deployment Process

- **Platform**: DigitalOcean droplet
- **User**: `chris` (general-purpose user with sudo access)
- **Trigger**: GitHub Action on push to `main`
- **Method**: The GitHub Action uses `appleboy/ssh-action` to SSH into the droplet and execute `sudo /home/chris/deploy.sh`
- **Deploy script**: `/home/chris/deploy.sh` — pulls latest code, installs dependencies, builds, and restarts the Node server

### Current GitHub Action

The workflow file at `.github/workflows/deploy.yml` currently:
1. Triggers on push to `main`
2. SSHs into the droplet using secrets (`DROPLET_IP`, `DROPLET_USER`, `SSH_PRIVATE_KEY`)
3. Executes `sudo /home/chris/deploy.sh`

> **Note**: After the repository restructuring, the deploy script on the droplet will need updating to account for the new `CMS/` subdirectory structure. The GitHub Action YAML has intentionally not been modified yet.

### Current Nginx Configuration

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

## Planned State

> **Status: Not yet implemented.** The migration to a dedicated deploy user is planned but has not been started. All commands below are examples or pending implementation.

### Goals

- Dedicated non-human `deploy` user (no general sudo access)
- Project checkout under `/home/deploy/apps/autonomous-portfolio`
- CMS located at `/home/deploy/apps/autonomous-portfolio/CMS`
- Dedicated GitHub Actions SSH key (separate from human keys)
- Limited permission to restart only the portfolio service
- systemd-managed Astro Node process
- Deployment script owned by the deploy user

### Planned Directory Structure

```text
/home/deploy/
├── apps/
│   └── autonomous-portfolio/
│       ├── CMS/
│       ├── WORKFLOWS/
│       ├── docs/
│       └── .github/
└── deploy.sh
```

### Planned systemd Service

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

### Planned Deploy Script

```bash
#!/bin/bash
# /home/deploy/deploy.sh
set -euo pipefail

APP_DIR="/home/deploy/apps/autonomous-portfolio"
cd "$APP_DIR"

git pull origin main
cd CMS
npm ci
npm run build
sudo systemctl restart portfolio
```

### Planned sudoers Entry

The `deploy` user should only be allowed to restart the portfolio service — no general sudo:

```text
# /etc/sudoers.d/deploy-portfolio
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart portfolio
```

### Planned GitHub Action Update

The `.github/workflows/deploy.yml` will need updating to:
1. Use the dedicated deploy user SSH key
2. Execute `/home/deploy/deploy.sh` (without `sudo` prefix, or with limited sudo)

---

## Migration Checklist

> **All items below are incomplete and pending implementation.**

- [ ] Create `deploy` user on the DigitalOcean droplet
- [ ] Set up SSH key for `deploy` user (dedicated for GitHub Actions)
- [ ] Add `deploy` user's public key to `authorized_keys`
- [ ] Clone repository to `/home/deploy/apps/autonomous-portfolio`
- [ ] Copy `.env` to `/home/deploy/apps/autonomous-portfolio/CMS/.env`
- [ ] Run initial `npm ci && npm run build` in the CMS directory
- [ ] Create systemd service file (`portfolio.service`)
- [ ] Enable and start the service
- [ ] Create sudoers entry for limited restart permission
- [ ] Create `/home/deploy/deploy.sh` and make it executable
- [ ] Update `.github/workflows/deploy.yml` to use new user and script path
- [ ] Update GitHub repository secrets (`DROPLET_USER`, `SSH_PRIVATE_KEY`)
- [ ] Test deployment via push to `main`
- [ ] Verify the site is accessible after deployment
- [ ] Remove old `chris` user deployment artifacts (deploy.sh, etc.)
- [ ] Update Nginx config if port changes

---

## Manual Deployment (Current)

If the GitHub Action is unavailable, deploy manually by SSHing into the droplet:

```bash
ssh chris@<droplet-ip>
sudo /home/chris/deploy.sh
```

## Manual Deployment (Planned)

```bash
ssh deploy@<droplet-ip>
/home/deploy/deploy.sh