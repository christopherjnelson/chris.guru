# Ziggy Portfolio Agent Workflow

This n8n workflow contains the orchestrator for **Ziggy**, Christopher Nelson's conversational portfolio AI assistant. It intercepts frontend chat inputs, searches a Supabase semantic Vector Store knowledge base, manages conversational session history (memory window), and answers user questions contextually via an advanced LLM agent.

## Workflow Overview

The architecture exposes a POST webhook interface that connects Christopher's front-end Portfolio / Astro UI to a LangChain AI Agent running inside n8n.

```text
       [USER CHAT INPUT] ──> [Frontend Chat Widget API]
                                     │
                             (POST Webhook URL)
                                     ↓
                          [WebhookFromPortfolio]
                                     │
                                     ▼
                               [ZiggyAgent]  <──>  [Simple Memory] (10 turns)
                                ↙        ↘
           [Supabase Vector Store]      [Qwen-3.6-Flash LLM]
                     ↓
         (RAG Semantic Search)
                     ↓
          (Formulate Response)
                     │
                     ▼
            [Respond to Webhook]
                     │
                     ▼
         [Return JSON payload to Client]
```

## How It Works

1. **Webhook Interface (`WebhookFromPortfolio`)**: Listens for incoming `POST` requests from the Portfolio Frontend CMS. Chat requests require a `chatInput` string and a `sessionId` string. Lightweight `{"heartbeat":true}` requests bypass the AI agent and return `{"status":"online"}`.
2. **LangChain Agent Core (`ZiggyAgent`)**: Configured as an adaptive conversational agent guiding overall reasoning. It has specific instructions on Christopher's background, professional boundaries, tone, privacy, and conversational discovery limitations.
3. **Conversational Memory (`Simple Memory`)**: Keeps a sliding window of the last `10` chat interactions mapped uniquely to the browser client's `sessionId`.
4. **Information Retrieval (Retrieval-Augmented Generation)**:
   - **Vectors Engine**: Contains the `Supabase Vector Store` node connected to the `knowledge_vectors` table.
   - **Embeddings Node**: Uses `Embeddings OpenAI` (`text-embedding-3-small`) to convert real-time chatbot questions into query vectors.
   - **Strict Behavior Guidelines**: The agent is restricted from making up facts or speaking on private topics. It queries and bases factual answers solely on documents retrieved from the vector database.
5. **Formulated Delivery**: Pipes the agent reasoning final paragraph back directly as a synchronous response via `Respond to Webhook`.

---

## Technical Prompts & Agent Tone Guidelines

Ziggy is specifically customized to align with Christopher's branding:
- **Tone**: Grounded, technically literate, confident, and professional, avoiding standard sales scripts or resume summaries.
- **Discovery Mode**: Answers broad introductory prompts concisely (2-3 sentences), encouraging interactive followups. Reveals structural details selectively based on direct requests.
- **Strict Fallback Rules**: Declares clearly what it is unable to locate within the portfolio database if search results return incomplete, rather than hallucinating details.

---

## Node Dependencies & Credentials Setup

To properly import and run this workflow, configure these credentials in n8n first:

### 1. Supabase API Credentials (`supabaseApi`)
- Used by the `Supabase Vector Store` node to execute pgvector cosine similarity searches on the `knowledge_vectors` table of your database.

### 2. OpenRouter Credentials (`openRouterApi`)
- Authenticates the `Qwen-3.6-Flash` language chat model core.

### 3. OpenAI Credentials (`openAiApi`)
- Configured inside the `Embeddings OpenAI` node to allow embedding generations of queries to compare against Supabase vectors.

---

## Import & Configuration Instructions

1. Copy the JSON contents from [workflow.json](./workflow.json).
2. Create or navigate to a workflow inside your n8n instance and **Import from File...** or paste this JSON directly in the canvas.
3. Hook up your valid **Supabase**, **OpenRouter**, and **OpenAI** credentials on their respective nodes.
4. Customize webhook endpoints:
   - Double-click the `WebhookFromPortfolio` node.
   - Notice the generic `your-webhook-path-uuid` placeholder. Replace it with your preferred UUID path, or keep it generic and let n8n auto-generate an endpoint.
5. Save and hit **Active**.
6. Register the newly generated webhook's Live URL in your Portfolio CMS front-end configuration (typically as `.env` variables or API routes targeting n8n).
