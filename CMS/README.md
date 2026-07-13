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
- **Achievements feed** — latest 5 achievement posts fetched from Supabase, ordered by date descending, rendered as a timeline.
- **Projects stub** — placeholder section for future project highlights.
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
```

| Variable                      | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `PUBLIC_SUPABASE_URL`         | Supabase project URL (public, safe for client)  |
| `PUBLIC_SUPABASE_ANON_KEY`    | Supabase anon key (public, used for SSR reads)  |
| `WEBHOOK_SECRET`              | Shared secret for n8n webhook authorization      |
| `N8N_CHAT_WEBHOOK`            | n8n webhook URL for Ziggy AI chat proxy (server-side only) |

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

> **Note**: The deployment workflow is currently in transition. After the repository restructuring, the deploy script on the droplet will need updating to account for the new `CMS/` subdirectory. The YAML has intentionally not been modified yet. See [`docs/deployment.md`](../docs/deployment.md) for details.

### How it works

1. A push to `main` triggers the workflow
2. The workflow uses [`appleboy/ssh-action`](https://github.com/appleboy/ssh-action) to SSH into the droplet
3. It executes `sudo /home/chris/deploy.sh` on the droplet, which pulls the latest code, installs dependencies, builds, and restarts the Node server

### Required GitHub Repository Secrets

| Secret             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `DROPLET_IP`       | IP address of the DigitalOcean droplet           |
| `DROPLET_USER`     | SSH username (e.g., `chris`)                     |
| `SSH_PRIVATE_KEY`  | Private SSH key authorized on the droplet        |

### Manual deployment

If needed, you can still deploy manually by SSHing into the droplet and running:

```bash
sudo /home/chris/deploy.sh
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
    │   ├── supabase.ts     # Supabase client initialization
    │   └── mockData.ts     # Legacy mock data (no longer imported)
    ├── components/
    │   └── ChatWidget.astro # Floating "Ziggy" AI chat widget (vanilla JS)
    ├── layouts/
    │   └── Layout.astro    # Dark-mode shell + responsive nav + enhanced footer (nav, socials, AI reviews) + global ChatWidget
    └── pages/
        ├── index.astro     # Home: SSR fetch from Supabase (skills, creds, achievements feed)
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
- [ ] **Feed pagination / progressive disclosure** — Implement "Load More" pattern for the achievements feed (fetch 20 from Supabase, show 5, reveal next 5 on click). Prevents the page from growing infinitely tall as backdated/backfilled items accumulate.
- [ ] Add authentication & admin middleware for content management
- [ ] Build out the Projects section with detail pages
- [ ] Add RSS/Atom feed for achievements
- [x] ~~CI/CD pipeline for automated deployment~~ — **Done: GitHub Action deploys to DigitalOcean droplet via SSH on push to main** (deploy script migration pending — see [docs/deployment.md](../docs/deployment.md))

## License

MIT