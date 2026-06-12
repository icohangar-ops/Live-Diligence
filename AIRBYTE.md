# Airbyte Agents Integration — Live Diligence

This document describes how [Airbyte Agents](https://docs.airbyte.com/ai-agents) can enrich your autonomous diligence memo platform with additional data sources via MCP and SDK integration.

---

## Overview

Live Diligence currently has two data sources: SEC EDGAR (filings) and Exa (web search). Airbyte Agents can add **30+ managed connectors** — insider trades, CRM data, support tickets, financial metrics, news feeds, and more — directly into the agent pipeline.

**Integration options:**
- **[MCP](https://docs.airbyte.com/ai-agents/interfaces/mcp)** — Remote MCP server. Best for conversational queries during diligence.
- **[SDK](https://docs.airbyte.com/ai-agents/interfaces/sdk)** — Python library for Node.js (via subprocess or direct HTTP).
- **[API](https://docs.airbyte.com/ai-agents/interfaces/sdk)** — REST for direct HTTP integration.

---

## Integration Points

### 1. Agent Runtime: MCP Data Enrichment

The agent runtime (`src/lib/agent-runtime.server.ts`) runs a multi-step pipeline: **Planner → SEC EDGAR → Exa → Synthesizer**. MCP calls slot naturally between these steps.

**Add the MCP server** in your agent configuration:
```json
{
  "mcpServers": {
    "airbyte": {
      "url": "https://mcp.airbyte.ai/mcp"
    }
  }
}
```

**Integration points in the agent loop:**

| Step | After | Airbyte Data to Add |
|------|-------|-------------------|
| Planner | ✓ | Use ticker to pre-fetch financial context |
| SEC EDGAR | Filings fetched | Add **insider trades**, **institutional ownership (13F)**, **patent filings** |
| Exa | Web search done | Add **Gong earnings call transcripts**, **Crunchbase funding data**, **Glassdoor reviews** |
| Synthesizer | All data collected | Include all Airbyte-sourced data in the memo context |

### 2. Custom Enrichment via SDK (Lambda Path)

For the AWS Lambda deployment (`aws/lambda/runner.ts`):

```typescript
// Example: Call Airbyte API from Lambda runner
async function enrichWithAirbyte(ticker: string, memoContext: string) {
  const response = await fetch('https://api.airbyte.ai/v1/agents/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRBYTE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connector: "gong",
      entity: "calls",
      action: "search",
      params: { query: ticker, limit: 5 },
    }),
  });
  const data = await response.json();
  return memoContext + `\n\n## Earnings Call Transcripts\n${JSON.stringify(data, null, 2)}`;
}
```

### 3. Scheduled Pre-Enrichment

For the Lovable/Vercel path, create a server function that pre-fetches Airbyte data before the agent runs:

```typescript
// src/lib/airbyte-enrichment.server.ts
import { createServerFn } from '@tanstack/start';

export const enrichWithAirbyte = createServerFn({ method: 'GET' })
  .validator((ticker: string) => ticker)
  .handler(async ({ data: ticker }) => {
    // Call Airbyte MCP or API to get enrichment data
    const response = await fetch('https://mcp.airbyte.ai/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_connector',
          arguments: {
            connector: 'gong',
            action: 'search_calls',
            params: { query: ticker },
          },
        },
      }),
    });
    return response.json();
  });
```

### 4. Database Tables for Enrichment Data

Add new Supabase tables to store pre-fetched Airbyte data:

```sql
-- Insider trading data
CREATE TABLE insider_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  filing_date DATE NOT NULL,
  transaction_type TEXT,
  shares_traded NUMERIC,
  price_per_share NUMERIC,
  reporting_person TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_insider_trades_ticker ON insider_trades(ticker);

-- Enrichment cache
CREATE TABLE enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  source TEXT NOT NULL, -- 'gong', 'crunchbase', 'glassdoor', etc.
  data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ticker, source)
);
```

---

## Getting Started

1. **Sign up** at [app.airbyte.ai](https://app.airbyte.ai).
2. **Add MCP** to your agent config (Claude, Cursor, Codex, etc.):
   ```
   URL: https://mcp.airbyte.ai/mcp
   ```
3. **Connect data sources** — Gong (earnings calls), Salesforce (CRM), Zendesk (support health), etc.
4. **Query during diligence**:
   > "I'm researching $AAPL. Connect to Gong via Airbyte MCP and get the last 3 earnings call transcripts. Then connect to Crunchbase and show me their recent M&A activity."

---

## Connector Catalog

| Data Domain | Connector | Diligence Use |
|-------------|-----------|--------------|
| **Earnings Calls** | Gong | Management tone, guidance changes |
| **CRM** | Salesforce, HubSpot | Customer concentration, pipeline health |
| **Support** | Zendesk, Intercom | Product quality signal |
| **Billing** | Stripe | Revenue validation, growth rate |
| **Analytics** | Mixpanel, Amplitude | User engagement, retention |
| **Communications** | Slack | Internal culture signal |
| **Data Warehouse** | Snowflake, BigQuery, Postgres | Financial model validation |

Full catalog: [docs.airbyte.com/ai-agents/connectors](https://docs.airbyte.com/ai-agents/connectors)
