# Knowledge Vectors Workflow

This n8n workflow synchronizes Christopher Nelson's public portfolio content
from Notion into the `knowledge_vectors_v2` Supabase vector table used by Ziggy.
It can run manually or every day at 3:00 AM.

## Workflow Overview

```text
[Manual / Daily Trigger]
          ↓
[Projects] [Experience] [Active Skills] [Credentials]
          ↓ normalize and append
   [Loop Over Documents]
          ↓
[Fetch Optional Page Body]
          ↓
[Delete Existing Document Vectors]
          ↓
[Split Text] → [BGE-M3 Embeddings] → [Insert Current Vectors]
          ↓
[Delete Stale Notion Vectors]
```

## How It Works

1. Reads the Projects, Experience, Skills, and Credentials data sources from
   Notion; inactive skills are excluded.
2. Normalizes the four schemas into a common document shape and appends them
   into one stream.
3. Fetches and converts page blocks when a record has additional page content.
4. Deletes existing chunks for the current source document before replacement.
5. Splits document text into overlapping chunks with the recursive character
   splitter.
6. Generates `baai/bge-m3` embeddings through an OpenAI-compatible provider and
   inserts the chunks into `knowledge_vectors_v2`.
7. Removes stale vectors whose Notion sources are no longer present after the
   refresh loop completes.

Because the workflow replaces and removes vector rows, verify its Supabase
project, table, and filters before activating the schedule.

## Required Credentials

- **Notion OAuth2 (`notionOAuth2Api`)** with read access to all four portfolio
  data sources and their page blocks
- **Supabase API (`supabaseApi`)** with permission to select, delete, and insert
  rows in `knowledge_vectors_v2`
- **OpenAI-compatible API (`openAiApi`)** configured for the BGE-M3 embedding
  provider

Credential bindings and private Notion identifiers are removed from the
checked-in export.

## Import and Configuration

1. Import [workflow.json](./workflow.json) into n8n.
2. Reconnect the Notion credential on every Notion node.
3. Replace the four placeholders with the matching Notion data-source IDs:
   - `your-projects-data-source-id`
   - `your-experience-data-source-id`
   - `your-skills-data-source-id`
   - `your-credentials-data-source-id`
4. Reconnect the Supabase credential and confirm both delete nodes and the
   vector-store insert target the intended project and `knowledge_vectors_v2`.
5. Reconnect the embedding credential and confirm the model is `baai/bge-m3`.
6. Run `Manual Refresh` first and verify the inserted and deleted rows.
7. Enable `Daily 3 AM Refresh` only after the manual run succeeds.
