# Autonomous Portfolio CMS

A lightweight, server-side rendered portfolio website built with **Astro** and configured to run as a standalone Node.js server, designed for deployment behind an Nginx reverse proxy. This initial scaffold uses hardcoded mock data — no databases or external APIs.

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | [Astro](https://astro.build) 5 (SSR, `output: 'server'`) |
| Adapter      | [`@astrojs/node`](https://docs.astro.build/en/guides/integrations-guide/node/) — `mode: 'standalone'` |
| Styling      | [Tailwind CSS](https://tailwindcss.com) v4 (via `@tailwindcss/vite`) |
| Language     | TypeScript (strict)                             |
| Runtime      | Node.js 18.20.8+ / 20.3+ / 22+                  |

## Features

- **Dark-mode-preferred UI** — clean, minimal slate/sky theme with a sticky top navigation bar.
- **About section** — short introduction to Chris, an IT administrator specializing in cloud identity and endpoint management.
- **Skills grid** — mock skills grouped by category (Cloud, Identity, Networking, Automation).
- **Achievements feed** — a timeline of 3rd-person achievement entries with dates.
- **Projects stub** — placeholder section for future project highlights.
- **JSON health endpoint** — `GET /api/test` returns `{"status":"Node SSR is active"}` to verify server endpoints.

## Prerequisites

- **Node.js** — 18.20.8, 20.3+, or 22+ (developed on Node 24)
- **npm** — 10+ (developed on npm 11)

## Getting Started

```bash
# install dependencies
npm install

# start the dev server (http://localhost:4321)
npm run dev

# build for production
npm run build

# preview the production build locally
npm run preview
```

## Production & Nginx Deployment

This project is configured with `output: 'server'` and the `@astrojs/node` adapter in `standalone` mode. After building, a self-contained Node server is emitted:

```
dist/
└── server/
    └── entry.mjs
```

Run the production server:

```bash
node ./dist/server/entry.mjs
```

By default it listens on `0.0.0.0:4321`. Override with environment variables:

```bash
HOST=127.0.0.1 PORT=3000 node ./dist/server/entry.mjs
```

### Example Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name portfolio.example.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
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

## Project Structure

```
portfolio/
├── astro.config.mjs        # Astro config: server output + Node standalone adapter + Tailwind
├── tsconfig.json           # TypeScript strict config (extends astro/tsconfigs/strict)
├── package.json
├── .gitignore
└── src/
    ├── styles/
    │   └── global.css      # Tailwind v4 import + dark mode variant
    ├── lib/
    │   └── mockData.ts     # Mock achievements & skills (typed)
    ├── layouts/
    │   └── Layout.astro    # Dark-mode shell + top nav (About, Skills, Feed, Projects)
    └── pages/
        ├── index.astro     # Home: About + Skills grid + Achievements feed + Projects stub
        └── api/
            └── test.ts     # GET /api/test → {"status":"Node SSR is active"}
```

## API Endpoints

| Method | Route       | Response                              | Description                    |
| ------ | ----------- | ------------------------------------- | ------------------------------ |
| `GET`  | `/api/test` | `{"status":"Node SSR is active"}`     | Health check / SSR verification |

## Roadmap

This scaffold intentionally excludes databases, authentication, and complex state management. Planned future work:

- [ ] Replace mock data with a real data layer (database/API)
- [ ] Add authentication & admin middleware for content management
- [ ] Build out the Projects section with detail pages
- [ ] Add RSS/Atom feed for achievements
- [ ] CI/CD pipeline for automated deployment

## License

MIT