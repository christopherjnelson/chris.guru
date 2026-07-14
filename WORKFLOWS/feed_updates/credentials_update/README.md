# Credentials Update Workflow

This n8n workflow parses, formats, and publishes certified learning and credential achievements from **Credly** and **Microsoft Learning** directly into Christopher Nelson's autonomous portfolio timeline database.

## Workflow Overview

The workflow runs on a **12-hour schedule trigger** or can be manually run. It synchronizes badging/credential data from public learner profiles to ensure the live portfolio timeline showcases the newest qualifications automatically.

```text
                  [Schedule Trigger / Manual]
                  ↙                         ↘
      [Credly JSON Profile]            [MS Learning Scraper]
               ↓                                 ↓
      [Split Credly Items]             [Structured Output Parser]
               ↓                                 ↓
       [Set Credly Data]                     [FormatData]
               ↳                                 ↓
                                           [Split MS Items]
                                                 ↓
                                            [Set MS Data]
                                                 ↓
                                           [Merge Streams]
                                                 ↓
                                         [Compare Datasets] ⇇ [Fetch Existing Posts]
                                                 ↓ (new entries only)
                                           [Copywriter LLM]
                                                 ↓
                                         [Insert Supabase Row]
```

## How It Works

1. **Triggering**: A `Schedule Trigger` fires every 12 hours.
2. **Credly Fetching**: Downloads the learner profile JSON directly from the Credly user badges endpoint (`getJSONFromCredly`).
3. **Microsoft Learning Scraping**: Uses Mendable's **Firecrawl** integration (`GetMSBadges`) to scrape Microsoft Learning profile data.
4. **Structured Parsing**: Uses `GLM-5.2` (OpenRouter) with an output structured parser to parse the scraped unstructured MS Learning page into predefined JSON badge schemas.
5. **Data Set Transformations**: Standardizes fields (Issuer, Title, Image URL, Earn/Badge Link, Completion Date, Source, etc.) from both streams into Unified Timeline Event schemas.
6. **Deduplication (`Compare Datasets`)**: Compares newly fetched credentials with all existing timeline entries fetched from the Supabase `posts` database table. Only credentials with a unique combination of `title` + `url` that do not already exist in Supabase are passed through.
7. **Copywriter LLM Formatting**: An AI Copywriter agent on `Qwen-3.6-Flash` formats a customized achievement summary paragraph detailing what capabilities were learned.
8. **Supabase Injection**: Appends the final achievement card details to the Supabase `posts` database table.

---

## Node Dependencies & Credentials Setup

To run or host this workflow, the following credentials must be connected in n8n:

### 1. OpenRouter Credentials (`openRouterApi`)
- Used by the `GLM-5.2` model configuration (MS Learning JSON parsing) and the `Qwen-3.6-Flash` node (timeline paragraph formatting).
- Require a valid OpenRouter API Key.

### 2. Supabase Credentials (`supabaseApi`)
- Used by the `GetExistingPosts` (Fetch) and `Create a row` (Insert) nodes.
- Requires your Supabase project URL and API Service Key.

### 3. Firecrawl API Credentials (`firecrawlApi` / Optional depending on Mendable node)
- Used by `GetMSBadges` to crawl/scrape Javascript-rendered Microsoft profile pages.

---

## Import & Configuration Instructions

1. Copy the JSON contents from [workflow.json](./workflow.json).
2. Open your n8n workspace, click **Add Workflow** (or **Workflows** → **New workflow**).
3. Open the top-right menu and choose **Import from File...** or paste the JSON clipboard directly into the workspace canvas.
4. Create/Select your valid **OpenRouter**, **Supabase**, and **Firecrawl** credentials on the respective n8n nodes.
5. Setup Microsoft profile parameters:
   - Edit the node `GetMSBadges` to specify your public MS Learn Profile URL.
6. Setup Credly profile parameters:
   - Edit the HTTP request node `getJSONFromCredly` to specify your exact Credly profile badge JSON endpoint (e.g., `https://www.credly.com/users/your-username/badges.json`).
7. Save the changes and switch **Active** toggle to true!
