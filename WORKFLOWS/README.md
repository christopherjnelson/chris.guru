# n8n Workflows

This directory contains sanitized exports of the n8n workflows that power the Autonomous Portfolio system — synchronizing data from Notion (source of truth) to Supabase, publishing achievements, and driving the Ziggy AI assistant.

## ⚠️ Security Warning

**Never export or commit n8n credentials, API keys, SSH keys, or personally sensitive data.**

Before committing any workflow JSON:

1. Remove or replace all credential references
2. Remove or replace webhook URLs containing instance-specific paths
3. Remove or replace Supabase keys, Notion tokens, and any API secrets
4. Remove workflow IDs if they reveal instance infrastructure
5. Verify no `credentials` property contains real credential data

## Directory Structure

```text
WORKFLOWS/
├── skills/           # Workflows syncing skills from Notion to Supabase
├── certifications/   # Workflows syncing certifications & learning paths
├── achievements/     # Workflows publishing achievement posts
├── projects/         # Workflows managing project highlights
├── ziggy/            # Workflows powering the Ziggy AI chat assistant
└── shared/           # Shared sub-workflows, utility logic, and helpers
```

## Naming Convention

Workflow files should follow this format:

```text
NN-purpose-description.workflow.json
```

Where `NN` is a two-digit ordering number.

### Examples

```text
01-sync-skills-from-notion.workflow.json
02-sync-certifications-from-resume.workflow.json
03-publish-achievement.workflow.json
04-ziggy-chat-webhook.workflow.json
```

## Workflow Inventory

| # | File | Purpose | Status |
|---|------|---------|--------|
| 01 | _pending_ | Sync skills from Notion to Supabase | _Not yet exported_ |
| 02 | _pending_ | Sync certifications & learning paths | _Not yet exported_ |
| 03 | _pending_ | Publish achievement to Supabase | _Not yet exported_ |
| 04 | _pending_ | Ziggy AI chat webhook | _Not yet exported_ |

## Safe Export Process

1. Open the workflow in n8n
2. Click the menu (three dots) → **Export**
3. Save the JSON file to the appropriate subdirectory
4. Open the file in a text editor
5. Search for and remove/replace:
   - `"credentials"` blocks — replace with `"credentials": {}`
   - Webhook URLs containing your n8n instance domain
   - Any hardcoded API keys, tokens, or secrets
   - Workflow IDs (optional but recommended)
6. Verify the file is safe: `grep -ri "key|token|secret|password|credential" *.json`
7. Commit the sanitized file

## Notes

- Workflow JSON files are intentionally version-controlled (unlike credentials)
- The `credentials/` directory is gitignored and should never be used
- If a workflow references a credential by name, document the credential type but not its value