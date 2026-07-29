# GitHub Update Workflow (Webhooks -> Portfolio)

This n8n workflow listens to live **GitHub Webhook push events** from Christopher Nelson's portfolios/repositories, summarizes multiple or single commit details into context-aware updates via an LLM, and inserts them onto the website's live Supabase timeline database in real-time.

## Workflow Overview

This workflow is entirely event-driven. Rather than running on a timer, it registers itself as a Webhook listener with GitHub, updating the portfolio timeline seconds after a push occurs.

```text
               [GitHub repository push event]
                             ↓
                     [GitHub Trigger]
                             ↓
                      [SetGHData Node]
                             ↓
                     [Copywriter LLM] ⇇ [Qwen-3.6-Flash]
                             ↓
                   [Insert Row (Supabase)]
```

## How It Works

1. **GitHub Trigger Node**: Subscribes to configured GitHub repositories and listens exclusively for `push` events.
2. **Data Extraction (`SetGHData`)**: Parses the webhook body, capturing:
   - Git branch name (replacing `refs/heads/` prefix)
   - Commit count
   - Primary heading/message of the latest commit
   - Full body text of all commit messages joined together
   - Repository name, comparison URL link, and HEAD commit timestamp
3. **Copywriter Intelligence (`Copywriter`)**: Uses a structured template prompt to guide an AI copywriting model (`Qwen-3.6-Flash` via OpenRouter):
   - Combines multiple commits into a single cohesive technical paragraph.
   - For a single commit, explains that exact commit clearly.
   - Restricts formatting to plain, natural copy, ignoring markdown, emojis, or list-style enumerations.
4. **Supabase Destination**: Inserts the newly prepared copy summary into the Supabase database `posts` table so that it appears instantly in the "Feed" section of the front-end application.

---

## Node Dependencies & Credentials Setup

To run or host this workflow, the following credentials must be configured:

### 1. GitHub Credentials (`gitHubApi` / Webhook Trigger)
- Used by the `Github Trigger` node. Requires a personal access token (PAT) with `repo` and `admin:repo_hook` permissions to automatically install the webhook inside your target repository.

### 2. OpenRouter Credentials (`openRouterApi`)
- Used by `Qwen-3.6-Flash` (LLM language model) to authenticate API requests to OpenRouter.

### 3. Supabase Credentials (`supabaseApi`)
- Used by the `Create a row` node to permit inserts into the Supabase table.

---

## Import & Configuration Instructions

1. Copy the JSON contents from [workflow.json](./workflow.json).
2. Open your n8n workspace, click **Add Workflow** (or **Workflows** → **New workflow**).
3. Open the top-right menu and choose **Import from File...** or paste the JSON clipboard directly into the workspace canvas.
4. Choose or register your valid **GitHub API**, **OpenRouter**, and **Supabase** credentials.
5. In the `Github Trigger` node, configure:
   - **Repository Owner/User**: Your GitHub username (typically `christopherjnelson`).
   - **Repository**: The repository name you wish to monitor (e.g. `autonomous-portfolio-cms`).
   - **Events**: `push`.
6. Save the workflow and trigger the activation switch. n8n will automatically register its Webhook listener URL with GitHub.
