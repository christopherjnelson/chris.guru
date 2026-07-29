# Portfolio Chatbot Workflow

This n8n workflow powers **Ziggy**, Christopher Nelson's portfolio assistant. It
provides separate chat and health endpoints, retrieves relevant portfolio facts
from Supabase, maintains short conversational memory, and returns a synchronous
response to the CMS.

## Workflow Overview

```text
[POST Chat Webhook] → [Ziggy Agent] → [Respond to Webhook]
                           ↑
              ┌────────────┼────────────┐
              │            │            │
        [Memory]   [Portfolio Vectors]  [Gemini]
                         ↑
                  [BGE-M3 Embeddings]

[GET Health Webhook] → [Health Response: {"status":"online"}]
```

## How It Works

1. `WebhookFromPortfolio` accepts POST requests containing `chatInput` and
   `sessionId`.
2. `ZiggyAgent` follows the portfolio-specific prompt and uses
   `Gemini-Flash-3.6` (`google/gemini-3.6-flash`) for response generation.
3. `Simple Memory` keeps the latest 10 interactions for the supplied session.
4. `Portfolio Knowledge V2` searches the `knowledge_vectors_v2` Supabase table,
   retrieving up to eight relevant results.
5. `OpenRouter BGE-M3` (`baai/bge-m3`) embeds the search query through an
   OpenAI-compatible credential.
6. `Respond to Webhook` returns the agent response to the CMS.
7. The separate `Health` GET webhook returns `{"status":"online"}` without
   invoking the model or vector store.

The embedded prompt intentionally retains Christopher's public name, portfolio
context, tone, and privacy boundaries.

## Required Credentials

- **Supabase API (`supabaseApi`)** for the `Portfolio Knowledge V2` vector store
- **OpenAI-compatible API (`openAiApi`)** configured for the BGE-M3 embedding
  provider
- **OpenRouter API (`openRouterApi`)** for the Gemini chat model

Credential bindings are removed from the checked-in export and must be
reconnected after import.

## Import and Configuration

1. Import [workflow.json](./workflow.json) into n8n.
2. Connect the Supabase, embedding, and OpenRouter credentials listed above.
3. Confirm the Supabase vector table is `knowledge_vectors_v2`.
4. Open `WebhookFromPortfolio`, replace `your-chat-webhook-path`, and record its
   production POST URL as the CMS `N8N_CHAT_WEBHOOK`.
5. Open `Health`, replace `your-health-webhook-path`, and record its production
   GET URL as the CI/CD `N8N_HEALTH_WEBHOOK`.
6. Activate the workflow.
7. Verify the health URL returns `{"status":"online"}`, then send a chat request
   containing both `chatInput` and `sessionId`.
