# Ghost Integration — Live Diligence

This document describes how [Ghost](https://ghost.build) — the Postgres database built for AI agents — can provide per-report, forkable databases for your autonomous diligence memo platform.

---

## Overview

Ghost provides unlimited Postgres databases you can create, fork, and discard freely. For Live Diligence, this means:

- **One database per report** — each diligence session gets its own isolated Postgres
- **Fork for scenario analysis** — clone a report to test different assumptions or data sources
- **MCP tools for agents** — the agent runtime can create/fork/query databases mid-pipeline

**Key Ghost commands:**
```bash
brew install timescale/tap/ghost       # Install
ghost init                               # Configure
ghost create diligence-aapl              # One DB per ticker
ghost fork diligence-aapl diligence-aapl-alt-data  # Fork to experiment
ghost sql diligence-aapl "SELECT * FROM reports"   # Query
ghost share diligence-aapl               # Share with a colleague
```

---

## Integration Points

### 1. Replace Supabase with Ghost (or Run Ghost Alongside)

Currently uses Supabase Postgres for `reports`, `report_events`, `profiles`, `usage`, `webhook_events`. Ghost can either:

**Option A: Replace Supabase entirely**
```bash
ghost create live-diligence-prod
ghost sql live-diligence-prod < supabase/migrations/*.sql
```

**Option B: Use Ghost for per-report databases alongside Supabase for user/auth**
- Supabase handles: `profiles`, `user_roles`, `usage`, `webhook_events` (auth-dependent)
- Ghost handles: one database per report, each containing `reports`, `report_events`, `sources`, `enrichment_data`

### 2. Per-Report Database Isolation (Recommended Pattern)

```bash
# When a user runs a diligence query
ghost create diligence-aapl-2026-06-12

# Seed it with SEC filings data
ghost sql diligence-aapl-2026-06-12 "
  INSERT INTO reports (query, ticker, status)
  VALUES ('Analyze AAPL competitive position', 'AAPL', 'running');
"

# Fork to compare data sources
ghost fork diligence-aapl-2026-06-12 diligence-aapl-with-gong
ghost fork diligence-aapl-2026-06-12 diligence-aapl-with-crunchbase

# Run agent against each fork
runAgent('diligence-aapl-2026-06-12', 'AAPL')
runAgent('diligence-aapl-with-gong', 'AAPL')
runAgent('diligence-aapl-with-crunchbase', 'AAPL')

# Compare memos
ghost sql diligence-aapl-2026-06-12 "SELECT memo_md FROM reports"
ghost sql diligence-aapl-with-gong "SELECT memo_md FROM reports"
ghost sql diligence-aapl-with-crunchbase "SELECT memo_md FROM reports"

# Delete losers
ghost delete diligence-aapl-with-gong
ghost delete diligence-aapl-with-crunchbase
```

### 3. MCP Integration for the Agent Runtime

Install Ghost MCP:
```bash
ghost mcp install claude-code
```

The agent runtime (`src/lib/agent-runtime.server.ts`) gets direct database tools:

```typescript
// In the agent loop — create a Ghost DB for this run
const dbName = `diligence-${ticker}-${Date.now()}`;

// Use Ghost MCP tools via the agent
// Step 1: Create DB
// Step 2: Seed initial schema
// Step 3: Run agent pipeline against dedicated DB
// Step 4: Fork for A/B testing of data sources
// Step 5: Keep the best result, delete the rest
```

**Example agent prompt (via MCP):**
> Create a new Ghost database for AAPL diligence. Seed it with the report schema. Fork it twice — one with Gong data, one with Crunchbase data. Run the agent pipeline against all three and compare the memos.

### 4. Ghost as Enrichment Data Cache

Instead of re-fetching SEC/Exa data every time, cache it in a Ghost DB:

```bash
ghost create diligence-cache

# On first fetch, write to cache
ghost sql diligence-cache "
  INSERT INTO sec_filings (ticker, form_type, filed_at, content)
  VALUES ('AAPL', '10-K', '2026-01-15', '...')
  ON CONFLICT (ticker, form_type, filed_at) DO NOTHING;
"

# On subsequent runs, check cache first
ghost sql diligence-cache \
  "SELECT content FROM sec_filings WHERE ticker='AAPL' LIMIT 1"
```

### 5. MCP Tool Usage in the Agent Pipeline

The current agent pipeline has clear integration points:

```
Planner → [Ghost: create DB, seed ticker metadata]
  → SEC EDGAR → [Ghost: cache filings in DB]
  → Exa → [Ghost: cache web results in DB]
  → Gong (via Airbyte MCP) → [Ghost: store transcripts in DB]
  → Synthesizer → [Ghost: write memo to DB]
  → [Ghost: fork for comparison, keep winner, delete rest]
```

---

## Architecture

```
Agent Runtime (agent-runtime.server.ts)
        │
        ├── Ghost MCP tools (ghost_create, ghost_sql, ghost_fork)
        │       │
        │       ▼
        │   Per-Report Ghost DBs
        │   ┌────────────────────┐
        │   │ diligence-aapl     │ ← reports, events, sources
        │   │ diligence-msft     │ ← reports, events, sources
        │   │ diligence-goog     │ ← reports, events, sources
        │   │                    │
        │   │ Fork → experiment  │ ← A/B test data sources
        │   │ Fork → alt-hypo    │ ← test different theses
        │   └────────────────────┘
        │
        └── Airbyte MCP (Gong, Crunchbase, SEC...)
                │
                ▼
            Enrichment Data
```

---

## Getting Started

1. **Install Ghost:**
   ```bash
   brew install timescale/tap/ghost
   ghost init
   ```
2. **Create a development database:**
   ```bash
   ghost create live-diligence-dev
   ```
3. **Install the MCP server for agent integration:**
   ```bash
   ghost mcp install claude-code
   ```
4. **Add Ghost to `.env.example`:**
   ```
   GHOST_API_KEY=gt_...
   GHOST_DEFAULT_DB=live-diligence-dev
   ```

---

## Resources
- [Ghost Documentation](https://ghost.build/docs)
- [Ghost MCP Tools](https://ghost.build/docs/#mcp-integration)
- [Ghost Tutorial](https://ghost.build/tutorials/learn-the-basics)
- [Deploy Ghost + App on Fly.io](https://ghost.build/tutorials/todo-app-on-fly)
