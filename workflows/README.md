# n8n Workflows

This directory contains sanitized n8n exports and setup documentation for the
Autonomous Portfolio. The workflows publish portfolio activity, maintain the
vector knowledge base, and power the Ziggy chatbot.

## Publishing and Security Policy

Workflow logic and public portfolio information are intentionally
version-controlled. This includes Christopher's name, public profile URLs,
public GitHub owner and repository names, prompts, model identifiers, database
table names, and internal node IDs.

Never commit:

- Credential bindings, credential IDs, or credential names from an n8n instance
- API keys, OAuth tokens, passwords, authorization headers, or private keys
- n8n instance IDs or production webhook paths and IDs
- Private account, workspace, project, or Notion data-source identifiers
- Pinned execution data or exported secrets files

## Directory Structure

```text
workflows/
├── README.md
├── feed_updates/
│   ├── credentials_update/
│   │   ├── README.md
│   │   └── workflow.json
│   └── github_update/
│       ├── README.md
│       └── workflow.json
├── knowledge_vectors/
│   ├── README.md
│   └── workflow.json
└── portfolio_chatbot/
    ├── README.md
    └── workflow.json
```

Each workflow directory contains a sanitized `workflow.json` export and a
`README.md` describing its behavior, dependencies, credentials, and import
steps.

## Workflow Inventory

| Workflow | Export | Documentation | Purpose |
|---|---|---|---|
| Credentials Update | [Export](./feed_updates/credentials_update/workflow.json) | [Setup guide](./feed_updates/credentials_update/README.md) | Polls Credly and Microsoft Learn, publishes new achievements to Supabase, and optionally posts them to LinkedIn. |
| GitHub Update | [Export](./feed_updates/github_update/workflow.json) | [Setup guide](./feed_updates/github_update/README.md) | Summarizes GitHub push events and publishes portfolio feed entries to Supabase. |
| Knowledge Vectors | [Export](./knowledge_vectors/workflow.json) | [Setup guide](./knowledge_vectors/README.md) | Synchronizes public portfolio content from Notion into the Supabase vector knowledge base. |
| Portfolio Chatbot | [Export](./portfolio_chatbot/workflow.json) | [Setup guide](./portfolio_chatbot/README.md) | Serves Ziggy's chat and health webhooks and answers questions using the vector knowledge base. |

## Safe Export Process

1. Export the workflow JSON from n8n into its workflow directory.
2. Remove every nonempty node `credentials` object.
3. Blank `meta.instanceId`.
4. Replace production webhook paths, webhook IDs, and private data-source IDs
   with descriptive placeholders.
5. Remove pinned execution data and cached URLs containing private identifiers.
6. Validate the JSON and scan it before committing:

   ```bash
   jq -e . workflow.json >/dev/null
   rg -ni "api.?key|authorization|bearer|password|private.?key|secret|token" workflow.json
   ```

7. Confirm every match is workflow logic or a safe placeholder, update the
   matching README, and review the complete diff.

Credential types and required services may be documented, but users must
reconnect their own credentials after importing an export.
