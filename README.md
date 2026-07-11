# Autonomous Portfolio CMS

A lightweight, server-side rendered portfolio website built with **Astro** and configured to run as a standalone Node.js server, designed for deployment behind an Nginx reverse proxy. Data is powered by a headless **Supabase** backend, with a secure webhook endpoint for n8n to post new achievements and an AI chat widget ("Ziggy") powered by an n8n webhook.

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | [Astro](https://astro.build) 5 (SSR, `output: 'server'`) |
| Adapter      | [`@astrojs/node`](https://docs.astro.build/en/guides/integrations-guide/node/) — `mode: 'standalone'` |
| Styling      | [Tailwind CSS](https://tailwindcss.com) v4 (via `@tailwindcss/vite`) |
| Database     | [Supabase](https://supabase.com) (PostgreSQL) — headless data layer |
| AI Chat      | n8n webhook (proxied via Astro API route)       |
| Language     | TypeScript (strict)                             |
| Runtime      | Node.js 18.20.8+ / 20.3+ / 22+                  |

## Features

- **Dark-mode-preferred UI** — clean, minimal slate/sky theme with a sticky top navigation bar featuring a cartoon avatar, social icons (LinkedIn, GitHub), and a responsive hamburger menu for mobile.
- **About section** — short introduction to Chris, an IT administrator specializing in cloud identity and endpoint management.
- **Skills grid** — skills fetched from Supabase, grouped by category.
- **Achievements feed** — latest 5 achievement posts fetched from Supabase, ordered by date descending, rendered as a timeline.
- **Projects stub** — placeholder section for future project highlights.
- **FAQ accordion** — 12 frequently asked questions using native `<details>`/`<summary>` elements with progressive disclosure (first 5 visible, "Show all" button reveals the rest).
- **Ziggy AI chat widget** — floating chat widget (bottom-right) with a toggle button, message bubbles, typing indicator, and vanilla JS. Proxied through an Astro API route to an n8n webhook to avoid CORS issues.
- **JSON health endpoint** — `GET /api/test` returns `{"status":"Node SSR is active"}` to verify server endpoints.
- **n8n webhook endpoint** — `POST /api/webhooks/achievement` accepts authorized POST requests to insert new achievements into Supabase.

## Prerequisites

- **Node.js** — 18.20.8, 20.3+, or 22+ (developed on Node 24)
- **npm** — 10+ (developed on npm 11)
- **Supabase project** — a Supabase project with `skills` and `posts` tables (see [Database Schema](#database-schema))
- **n8n workflow** — an n8n chat webhook for the Ziggy AI assistant (see [Environment Variables](#environment-variables))

## Environment Variables

Create a `.env` file in the project root (do not commit it — it's in `.gitignore`):

```env
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
WEBHOOK_SECRET="your-secret-key-for-n8n"
N8N_CHAT_WEBHOOK="https://your-n8n-instance/webhook/your-chat-webhook-id"
```

| Variable                      | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `PUBLIC_SUPABASE_URL`         | Supabase project URL (public, safe for client)  |
| `PUBLIC_SUPABASE_ANON_KEY`    | Supabase anon key (public, used for SSR reads)  |
| `WEBHOOK_SECRET`              | Shared secret for n8n webhook authorization      |
| `N8N_CHAT_WEBHOOK`            | n8n webhook URL for Ziggy AI chat proxy (server-side only) |

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
├── .env                    # Environment variables (not committed)
├── .gitignore
├── public/
│   └── avatar.png          # Cartoon avatar for nav bar
└── src/
    ├── styles/
    │   └── global.css      # Tailwind v4 import + dark mode variant
    ├── lib/
    │   ├── supabase.ts     # Supabase client initialization
    │   └── mockData.ts     # Legacy mock data (no longer imported)
    ├── components/
    │   └── ChatWidget.astro # Floating "Ziggy" AI chat widget (vanilla JS)
    ├── layouts/
    │   └── Layout.astro    # Dark-mode shell + responsive nav (hamburger on mobile) with avatar, socials + global ChatWidget
    └── pages/
        ├── index.astro     # Home: SSR fetch from Supabase (skills + achievements feed) + FAQ accordion
        └── api/
            ├── test.ts              # GET /api/test → {"status":"Node SSR is active"}
            ├── chat.ts              # POST /api/chat → proxy to n8n webhook for Ziggy AI
            └── webhooks/
                └── achievement.ts   # POST /api/webhooks/achievement → insert to Supabase
```

## API Endpoints

| Method | Route                          | Auth                          | Response                          | Description                                      |
| ------ | ------------------------------ | ----------------------------- | --------------------------------- | ------------------------------------------------ |
| `GET`  | `/api/test`                    | None                          | `{"status":"Node SSR is active"}` | Health check / SSR verification                  |
| `POST` | `/api/chat`                    | None                          | `{"reply":"..."}`                 | Proxy user message to n8n webhook for Ziggy AI   |
| `POST` | `/api/webhooks/achievement`    | `Authorization` header        | `{"success":true}`                | Insert a new achievement into Supabase (for n8n) |

### Chat API Usage

```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What does Chris do?"}'
```

The proxy sends `{"chatInput": "What does Chris do?"}` to the n8n webhook and returns `{"reply": "Ziggy's response"}`.

### Webhook Usage

```bash
curl -X POST http://localhost:4321/api/webhooks/achievement \
  -H "Content-Type: application/json" \
  -H "Authorization: your-webhook-secret" \
  -d '{"title":"New Certification","content":"Chris earned a new certification today."}'
```

## Database Schema

The Supabase project requires two tables:

### `skills`
| Column     | Type    | Description                |
| ---------- | ------- | -------------------------- |
| `id`       | int     | Primary key                |
| `name`     | text    | Skill name                 |
| `category` | text    | Category (e.g., "Cloud")   |

### `posts`
| Column    | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| `id`      | int     | Primary key                                  |
| `title`   | text    | Achievement title                            |
| `content` | text    | Achievement description (3rd person)         |
| `date`    | date    | Date of achievement (defaults to now)        |
| `type`    | text    | Post type (e.g., `'achievement'`)            |

### Row-Level Security (RLS)

Enable RLS and allow the `anon` role to read and insert:

```sql
-- Skills: allow read
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read on skills" ON skills FOR SELECT TO anon USING (true);

-- Posts: allow read + insert
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read on posts" ON posts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on posts" ON posts FOR INSERT TO anon WITH CHECK (true);
```

## Roadmap

- [x] ~~Replace mock data with a real data layer (database/API)~~ — **Done: Supabase integration**
- [x] ~~Secure webhook endpoint for n8n achievement posts~~ — **Done**
- [x] ~~FAQ accordion with progressive disclosure~~ — **Done: 12 items, show/hide pattern**
- [x] ~~Nav avatar with circular border~~ — **Done: `public/avatar.png`**
- [x] ~~Ziggy AI chat widget with n8n proxy~~ — **Done: floating widget, vanilla JS, API proxy route**
- [x] ~~Responsive mobile nav + social icons~~ — **Done: hamburger menu, LinkedIn/GitHub icons (christopherjnelson)**
- [ ] **Feed pagination / progressive disclosure** — Implement "Load More" pattern for the achievements feed (fetch 20 from Supabase, show 5, reveal next 5 on click). Matches the FAQ progressive disclosure pattern. Prevents the page from growing infinitely tall as backdated/backfilled items accumulate. Alternative options considered: horizontal carousel, SSR query-param pagination, 2-column grid.
- [ ] Add authentication & admin middleware for content management
- [ ] Build out the Projects section with detail pages
- [ ] Add RSS/Atom feed for achievements
- [ ] CI/CD pipeline for automated deployment

## License

MIT