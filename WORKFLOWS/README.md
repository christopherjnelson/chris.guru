# n8n Workflows

This directory contains exports and documentation for the n8n workflows that power the Autonomous Portfolio. The checked-in workflows publish credential and GitHub activity to Supabase and provide the Ziggy portfolio assistant.

## Security Warning

Never export or commit n8n credentials, API keys, SSH keys, webhook secrets, or personally sensitive data.

Before committing a workflow export:

1. Remove or replace credential values and sensitive credential references.
2. Remove or replace instance-specific webhook URLs and paths.
3. Remove Supabase keys, Notion tokens, and other API secrets.
4. Remove workflow and instance identifiers when they reveal infrastructure details.
5. Review the final diff before committing it.

## Directory Structure

```text
WORKFLOWS/
|-- README.md
|-- feed_updates/
|   |-- credentials_update/
|   |   |-- README.md
|   |   `-- workflow.json
|   `-- github_update/
|       |-- README.md
|       `-- workflow.json
`-- ziggy_portfolio_agent/
    |-- README.md
    `-- workflow.json
```

Each workflow lives in a descriptive directory containing:

- `workflow.json`: the n8n workflow export.
- `README.md`: its behavior, dependencies, credentials, and import instructions.

## Workflow Inventory

| Workflow | Export | Documentation | Purpose |
|---|---|---|---|
| Credentials Update | [`workflow.json`](./feed_updates/credentials_update/workflow.json) | [Setup guide](./feed_updates/credentials_update/README.md) | Polls Credly and Microsoft Learn, deduplicates credentials, formats new achievements, and publishes them to Supabase. |
| GitHub Update | [`workflow.json`](./feed_updates/github_update/workflow.json) | [Setup guide](./feed_updates/github_update/README.md) | Receives GitHub push events, summarizes changes, and publishes feed entries to Supabase. |
| Ziggy Portfolio Agent | [`workflow.json`](./ziggy_portfolio_agent/workflow.json) | [Setup guide](./ziggy_portfolio_agent/README.md) | Serves the portfolio chat webhook and answers questions using the Supabase vector knowledge base. |

## Safe Export Process

1. Export the workflow JSON from n8n.
2. Save it as `workflow.json` in the appropriate workflow directory.
3. Remove or replace credentials, secrets, instance URLs, webhook paths, and sensitive identifiers.
4. Search the export for sensitive terms, for example:

   ```text
   rg -ni "api.?key|token|secret|password|credential|webhook" workflow.json
   ```

5. Confirm every match is a safe node type, placeholder, or credential reference without a secret value.
6. Update the workflow's local `README.md` when its nodes, models, dependencies, or setup steps change.
7. Review and commit the sanitized export and documentation together.

## Notes

- Workflow JSON exports are intentionally version-controlled; secret values are not.
- Credential types and required services may be documented, but credential values must never be committed.
- The portfolio's knowledge content is stored in Supabase. No Notion synchronization workflow is currently included in this directory.
