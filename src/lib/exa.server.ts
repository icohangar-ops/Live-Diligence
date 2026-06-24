// Exa web search — Airbyte Agent CLI primary, direct Exa API fallback.

import { airbyteCliConfigured, airbyteConnectorExecute, unwrapConnectorData } from "./airbyte-cli.server";

export interface ExaResult {
  title: string;
  url: string;
  text?: string;
  published_date?: string;
}

function mapExaRow(row: Record<string, unknown>): ExaResult {
  return {
    title: String(row.title || row.url || "Untitled"),
    url: String(row.url || ""),
    text: typeof row.text === "string" ? row.text : "",
    published_date: typeof row.published_date === "string"
      ? row.published_date
      : typeof row.publishedDate === "string"
        ? row.publishedDate
        : undefined,
  };
}

function normalizeExaRows(payload: unknown): ExaResult[] {
  const data = unwrapConnectorData<unknown>(payload);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>)?.results)
      ? (data as Record<string, unknown>).results as unknown[]
      : Array.isArray((data as Record<string, unknown>)?.items)
        ? (data as Record<string, unknown>).items as unknown[]
        : [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map(mapExaRow)
    .filter((row) => row.url);
}

async function exaSearchViaCli(query: string, n: number): Promise<ExaResult[]> {
  const raw = await airbyteConnectorExecute({
    name: "exa",
    entity: "search_results",
    action: "list",
    params: {
      query,
      type: "neural",
      num_results: n,
      contents: {
        text: { max_characters: 1200 },
        livecrawl: "fallback",
      },
    },
    select_fields: ["title", "url", "text", "published_date"],
  });
  return normalizeExaRows(raw);
}

async function exaSearchDirect(query: string, n: number): Promise<ExaResult[]> {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({
      query,
      numResults: n,
      type: "neural",
      useAutoprompt: true,
      contents: { text: { maxCharacters: 1200 }, livecrawl: "fallback" },
    }),
  });
  if (!res.ok) return [];
  const json = await res.json() as { results?: Record<string, unknown>[] };
  return (json.results || []).map(mapExaRow).filter((row) => row.url);
}

export async function exaSearch(query: string, n = 6): Promise<ExaResult[]> {
  if (airbyteCliConfigured()) {
    try {
      return await exaSearchViaCli(query, n);
    } catch (err) {
      console.warn("[exa] Airbyte CLI search failed; falling back to EXA_API_KEY:", err);
    }
  }
  return exaSearchDirect(query, n);
}
