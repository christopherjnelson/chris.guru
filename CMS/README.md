# Autonomous Portfolio CMS

A lightweight, server-side rendered portfolio website built with **Astro** and configured to run as a standalone Node.js server, designed for deployment behind an Nginx reverse proxy. Data is powered by a headless **Supabase** backend, with a secure webhook endpoint for n8n to post new achievements and an AI chat widget ("Ziggy") powered by an n8n webhook.

> **Note**: This is the `CMS/` subdirectory of the [Autonomous Portfolio CMS](../README.md) repository. Commands below should be run from this directory. From the repository root, run `cd CMS` first.

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Framework    | [Astro](https://astro.build) 5 (SSR, `output: 'server'`) |
| Adapter      | [`@astrojs/node`](https://docs.astro.build/en/guides/integrations-guide/node/) — `mode: 'standalone'` |
| Styling      | [Tailwind CSS](https://tailwindcss.com) v4 (via `@tailwindcss/vite`) |
| Database     | [Supabase](https://supabase.com) (PostgreSQL) — headless data layer |
| AI Chat      | n8n webhook (proxied via Astro API route)       |
| Markdown     | [marked](https://marked.js.org) — markdown-to-HTML parsing for chat |
| Language     | TypeScript (strict)                             |
| Runtime      | Node.js 18.20.8+ / 20.3+ / 22+                  |

## Features

- **Dark-mode-preferred UI** — clean, minimal slate/sky theme with a sticky top navigation bar featuring a cartoon avatar, social icons (LinkedIn, GitHub), and a responsive hamburger menu for mobile.
- **About section** — expanded two-paragraph bio covering Chris's decade of IT operations experience, hands-on technologies, and real-world achievements, with an inline link to [wiki.chris.guru](https://wiki.chris.guru).
- **Skills grid** — skills fetched from Supabase, grouped by category. Includes a link button to [wiki.chris.guru](https://wiki.chris.guru) for in-depth skill documentation.
- **Certifications section** — certifications and learning paths fetched from a dedicated `creds` table in Supabase, grouped by category in a grid layout (matching the Skills section). If a `url` is provided, the cred renders as a clickable external link with an icon.
- **Activity feed** — latest 20 posts fetched from Supabase (all types), ordered by date descending, rendered as a timeline with progressive disclosure. The first 5 posts are visible on page load; a "Load More" button reveals the next 5 on click and disappears once everything is shown. Source filter tabs ("All" plus one tab per distinct `source` value found in the fetched posts) let visitors narrow the timeline; pagination resets per tab and "Load More" pages within the active filter. Each post card includes source-specific icons (GitHub, Slack, Microsoft, Okta), type-based accent colors, optional image, and external link support.
- **Projects section** — public GitHub repositories fetched server-side from the GitHub API (`christopherjnelson`), filtered to exclude forks and sorted by star count. Each repo renders as a card with name, description, language badge, star count, and last updated date.
- **Ziggy AI chat widget** — floating chat widget (bottom-right) with a toggle button, message bubbles, typing indicator, and vanilla JS. Proxied through an Astro API route to an n8n webhook to avoid CORS issues. Bot responses parse markdown via `marked` (bold, italic, lists, code, links, headings, blockquotes) with DOM-based sanitization for XSS safety; user input is escaped via `textContent`. Paragraph and `<br>` spacing tuned for readable multi-paragraph responses.
- **Enhanced footer** — 3-column layout with navigation links, social links (LinkedIn, GitHub), and humorous "AI Reviews" from Gemini, ChatGPT, and Grok with stylized logos.
- **JSON health endpoint** — `GET /api/test` returns `{"status":"Node SSR is active"}` to verify server endpoints.
- **n8n webhook endpoint** — `POST /api/webhooks/achievement` accepts authorized POST requests to insert new achievements into Supabase.

## Prerequisites

- **Node.js** — 18.20.8, 20.3+, or 22+ (developed on Node 24)
- **npm** — 10+ (developed on npm 11)
- **Supabase project** — a Supabase project with `skills`, `creds`, and `posts` tables (see [Database Schema](#database-schema))
- **n8n workflow** — an n8n chat webhook for the Ziggy AI assistant (see [Environment Variables](#environment-variables))

## Environment Variables

Create a `.env` file in the `CMS/` directory (do not commit it — it's in `.gitignore`):

```env
PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
WEBHOOK_SECRET="your-secret-key-for-n8n"
N8N_CHAT_WEBHOOK="https://your-n8n-instance/webhook/your-chat-webhook-id"
GITHUB_TOKEN="your-github-personal-access-token"
```

| Variable                      | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `PUBLIC_SUPABASE_URL`         | Supabase project URL (public, safe for client)  |
| `PUBLIC_SUPABASE_ANON_KEY`    | Supabase anon key (public, used for SSR reads)  |
| `WEBHOOK_SECRET`              | Shared secret for n8n webhook authorization      |
| `N8N_CHAT_WEBHOOK`            | n8n webhook URL for Ziggy AI chat proxy (server-side only) |
| `GITHUB_TOKEN`                | GitHub PAT for API rate limit increase (server-side only, no scopes required) |

## Getting Started

> **Note**: Run these commands from the `CMS/` directory. From the repository root, run `cd CMS` first.

```bash
# install dependencies
npm ci

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

## CI/CD Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml` at the repository root) that automatically deploys to a DigitalOcean droplet on every push to the `main` branch.

> **Note**: The deployment workflow uses a dedicated `deploy` user with restricted permissions and a systemd-managed process. See [`docs/deployment.md`](../docs/deployment.md) for details.

### How it works

1. A push to `main` triggers the workflow
2. The workflow uses [`appleboy/ssh-action`](https://github.com/appleboy/ssh-action) to SSH into the droplet
3. It executes `/home/deploy/deploy.sh` on the droplet, which pulls the latest code, installs dependencies, builds, and restarts the Node server via systemd

### Required GitHub Repository Secrets

| Secret             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `DROPLET_IP`       | IP address of the DigitalOcean droplet           |
| `DROPLET_USER`     | SSH username (e.g., `deploy`)                    |
| `SSH_PRIVATE_KEY`  | Private SSH key authorized on the droplet        |

### Manual deployment

If needed, you can still deploy manually by SSHing into the droplet and running:

```bash
ssh deploy@<droplet-ip>
/home/deploy/deploy.sh
```

## Project Structure

This is the `CMS/` subdirectory of the repository. The full repository structure is documented in the [root README](../README.md).

```
CMS/
├── astro.config.mjs        # Astro config: server output + Node standalone adapter + Tailwind
├── tsconfig.json           # TypeScript strict config (extends astro/tsconfigs/strict)
├── package.json
├── .env                    # Environment variables (not committed)
├── public/
│   ├── avatar.png          # Cartoon avatar for nav bar (1024x1024)
│   └── favicon.png         # Favicon for browser tabs (1024x1024)
└── src/
    ├── styles/
    │   └── global.css      # Tailwind v4 import + dark mode variant
    ├── lib/
    │   └── supabase.ts     # Supabase client initialization
    ├── types/
    │   ├── post.ts         # Post type definition (feed items)
    │   └── repo.ts         # GitHub repo type definition (projects)
    ├── components/
    │   ├── ChatWidget.astro # Floating "Ziggy" AI chat widget (vanilla JS)
    │   ├── Feed.astro       # Activity feed timeline with source filter tabs + "Load More" pagination
    │   ├── FeedCard.astro   # Individual feed card (source icons, badges, conditional fields)
    │   └── ProjectCard.astro # GitHub repo card (name, description, language, stars)
    ├── layouts/
    │   └── Layout.astro    # Dark-mode shell + responsive nav + enhanced footer (nav, socials, AI reviews) + global ChatWidget
    └── pages/
        ├── index.astro     # Home: SSR fetch from Supabase (skills, creds, achievements feed)
        └── api/
            ├── test.ts              # GET /api/test → {"status":"Node SSR is active"}
            ├── health.ts             # GET /api/health → {"status":"online"|"offline"} (n8n reachability)
            ├── chat.ts              # POST /api/chat → proxy to n8n webhook for Ziggy AI
            └── webhooks/
                └── achievement.ts   # POST /api/webhooks/achievement → insert to Supabase
```

## API Endpoints

| Method | Route                          | Auth                          | Response                          | Description                                      |
| ------ | ------------------------------ | ----------------------------- | --------------------------------- | ------------------------------------------------ |
| `GET`  | `/api/test`                    | None                          | `{"status":"Node SSR is active"}` | Health check / SSR verification                  |
| `GET`  | `/api/health`                   | None                          | `{"status":"online"|"offline"}`   | Send a lightweight heartbeat to the n8n chat webhook |
| `POST` | `/api/chat`                    | None                          | `{"reply":"..."}`                 | Proxy user message to n8n webhook for Ziggy AI   |
| `POST` | `/api/webhooks/achievement`    | `Authorization` header        | `{"success":true}`                | Insert a new achievement into Supabase (for n8n) |

### Chat API Usage

```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What does Chris do?"}'
```

The proxy sends `{"chatInput": "What does Chris do?"}` to the n8n webhook and returns `{"reply": "Ziggy's response"}`.

The chat widget starts offline and enables input only after `/api/health` receives
the expected `{"status":"online"}` heartbeat response from n8n. It checks again
periodically, when the tab becomes visible, and when an offline widget is opened.

### Webhook Usage

```bash
curl -X POST http://localhost:4321/api/webhooks/achievement \
  -H "Content-Type: application/json" \
  -H "Authorization: your-webhook-secret" \
  -d '{"title":"New Certification","content":"Chris earned a new certification today."}'
```

## Database Schema

The Supabase project requires three tables:

### `skills`
| Column     | Type    | Description                                          |
| ---------- | ------- | ---------------------------------------------------- |
| `id`       | int     | Primary key                                          |
| `name`     | text    | Skill name                                           |
| `category` | text    | Category (e.g., "Cloud", "Networking")               |

### `creds`
| Column     | Type    | Description                                          |
| ---------- | ------- | ---------------------------------------------------- |
| `id`       | int     | Primary key                                          |
| `name`     | text    | Certification or learning path name                  |
| `category` | text    | Category (e.g., "Certifications", "Learning Paths")  |
| `url`      | text    | Optional URL (renders as external link with icon)    |

### `posts`
| Column      | Type   | Description                                          |
| ----------- | ------ | ---------------------------------------------------- |
| `id`        | int    | Primary key                                          |
| `title`     | text   | Post title (nullable)                                |
| `content`   | text   | Post body / description (nullable)                   |
| `type`      | text   | Post type (`'achievement'`, `'github_event'`, `'note'`) |
| `date`      | date   | Date of post (defaults to now)                       |
| `issuer`    | text   | Issuer name, e.g. certification provider (nullable)  |
| `image_url` | text   | Optional image URL for the post card (nullable)      |
| `url`       | text   | Optional external link for the post card (nullable)  |
| `source`    | text   | Source system (`'github'`, `'slack'`, `'microsoft'`, `'okta'`) (nullable) |

### Row-Level Security (RLS)

Enable RLS and allow the `anon` role to read and insert:

```sql
-- Skills: allow read
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read on skills" ON skills FOR SELECT TO anon USING (true);

-- Creds: allow read
ALTER TABLE creds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read on creds" ON creds FOR SELECT TO anon USING (true);

-- Posts: allow read + insert
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read on posts" ON posts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on posts" ON posts FOR INSERT TO anon WITH CHECK (true);
```

## Roadmap

- [x] ~~Replace mock data with a real data layer (database/API)~~ — **Done: Supabase integration**
- [x] ~~Secure webhook endpoint for n8n achievement posts~~ — **Done**
- [x] ~~Nav avatar with circular border~~ — **Done: `public/avatar.png`**
- [x] ~~Ziggy AI chat widget with n8n proxy~~ — **Done: floating widget, vanilla JS, API proxy route**
- [x] ~~Responsive mobile nav + social icons~~ — **Done: hamburger menu, LinkedIn/GitHub icons (christopherjnelson)**
- [x] ~~Certifications section with URL links~~ — **Done: moved to dedicated `creds` table, grid layout, external link support**
- [x] ~~Enhanced footer with AI reviews~~ — **Done: 3-column footer (nav, socials, Gemini/ChatGPT/Grok reviews)**
- [x] ~~FAQ section removed~~ — **Done: FAQ data moved to Ziggy chatbot**
- [x] ~~Favicon~~ — **Done: `public/favicon.png` linked in Layout.astro head**
- [x] ~~Markdown formatting for Ziggy chat~~ — **Done: `marked` library with DOM-based sanitization**
- [x] ~~Wiki links~~ — **Done: inline link in About + button in Skills section pointing to wiki.chris.guru**
- [x] ~~Feed pagination / progressive disclosure~~ — **Done: "Load More" pattern implemented in `Feed.astro` (fetch 20 from Supabase, show 5, reveal next 5 on click)**
- [x] ~~Feed source filters~~ — **Done: tab bar in `Feed.astro` generated from the distinct `source` values in the fetched posts ("All" + one tab per source); pagination resets per tab**
- [ ] Add authentication & admin middleware for content management
- [x] ~~Build out the Projects section~~ — **Done: GitHub repos fetched server-side via GitHub API, rendered as cards with star count, language, and last updated**
- [ ] Add RSS/Atom feed for achievements
- [x] ~~CI/CD pipeline for automated deployment~~ — **Done: GitHub Action deploys to DigitalOcean droplet via SSH on push to main using a dedicated `deploy` user with systemd-managed process** (see [docs/deployment.md](../docs/deployment.md))

## License

MIT
