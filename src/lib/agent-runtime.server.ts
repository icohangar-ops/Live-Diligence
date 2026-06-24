// Server-only agent runtime helpers. Imported only inside server route handlers.
// Uses LOVABLE_API_KEY (auto-provisioned). Exa via Airbyte CLI (EXA connector in app.airbyte.ai).
// SEC EDGAR stays direct (no Airbyte connector).

import { exaSearch, type ExaResult } from "@/lib/exa.server";

const SEC_UA = "Live Diligence research-agent (contact@livediligence.app)";
const LOVABLE_AI_BASE = "https://ai.gateway.lovable.dev/v1";

type Json = Record<string, unknown>;

export interface RunContext {
  reportId: string;
  query: string;
  emit: (step: string, payload: Json, status?: string) => Promise<void>;
  setReport: (patch: Json) => Promise<void>;
  isPro: boolean;
}

// ---------- LLM ----------

async function llm(model: string, messages: { role: string; content: string }[], opts: { json?: boolean; maxTokens?: number } = {}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: any = { model, messages, max_tokens: opts.maxTokens ?? 2048 };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${LOVABLE_AI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ---------- Planner ----------

interface Plan {
  ticker: string | null;
  company_name: string;
  sub_questions: string[];
  web_queries: string[];
}

async function plan(query: string): Promise<Plan> {
  const sys = `You are a senior equity-research analyst. Given a user query, identify the public company being asked about, return its US stock ticker if listed (uppercase), the company name, 4 sharp diligence sub-questions, and 4 high-signal web search queries to investigate it. Return STRICT JSON: {"ticker": string|null, "company_name": string, "sub_questions": string[4], "web_queries": string[4]}.`;
  const out = await llm("google/gemini-2.5-flash", [
    { role: "system", content: sys },
    { role: "user", content: query },
  ], { json: true, maxTokens: 700 });
  try {
    const p = JSON.parse(out);
    return {
      ticker: p.ticker ? String(p.ticker).toUpperCase() : null,
      company_name: String(p.company_name || query),
      sub_questions: Array.isArray(p.sub_questions) ? p.sub_questions.slice(0, 4) : [],
      web_queries: Array.isArray(p.web_queries) ? p.web_queries.slice(0, 4) : [query],
    };
  } catch {
    return { ticker: null, company_name: query, sub_questions: [], web_queries: [query] };
  }
}

// ---------- SEC EDGAR ----------

interface Filing { form: string; filed: string; accession: string; url: string; primary_doc: string }

async function tickerToCik(ticker: string): Promise<string | null> {
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: { "user-agent": SEC_UA } });
  if (!res.ok) return null;
  const map = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
  for (const k in map) if (map[k].ticker?.toUpperCase() === ticker.toUpperCase()) return String(map[k].cik_str).padStart(10, "0");
  return null;
}

async function recentFilings(ticker: string): Promise<Filing[]> {
  const cik = await tickerToCik(ticker);
  if (!cik) return [];
  const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "user-agent": SEC_UA } });
  if (!res.ok) return [];
  const j = await res.json();
  const f = j.filings?.recent;
  if (!f) return [];
  const want = new Set(["10-K", "10-Q", "8-K"]);
  const out: Filing[] = [];
  const seen: Record<string, number> = {};
  for (let i = 0; i < (f.form?.length || 0); i++) {
    const form = f.form[i];
    if (!want.has(form)) continue;
    if ((seen[form] || 0) >= (form === "8-K" ? 3 : 1)) continue;
    seen[form] = (seen[form] || 0) + 1;
    const accNoDashes = (f.accessionNumber[i] as string).replace(/-/g, "");
    out.push({
      form,
      filed: f.filingDate[i],
      accession: f.accessionNumber[i],
      primary_doc: f.primaryDocument[i],
      url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accNoDashes}/${f.primaryDocument[i]}`,
    });
    if (out.length >= 5) break;
  }
  return out;
}

// ---------- Synthesizer ----------

async function synthesize(args: {
  query: string;
  company: string;
  ticker: string | null;
  filings: Filing[];
  webResults: ExaResult[];
  subQuestions: string[];
  isPro: boolean;
}): Promise<string> {
  const model = args.isPro ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
  const sys = `You are a senior equity-research analyst writing an institutional diligence memo. Output GitHub-flavored Markdown with these exact H2 sections, in this order:

## Executive Summary
## Thesis
## Financials & KPIs
## Risks
## Catalysts
## Sources

Be specific, cite numbers from the filings when possible, and inline-cite web sources using [n] referencing the Sources list. Keep it ~700-900 words. Do not include disclaimers.`;

  const ctx = [
    `User query: ${args.query}`,
    `Company: ${args.company}${args.ticker ? ` (${args.ticker})` : ""}`,
    args.subQuestions.length ? `Sub-questions to address:\n- ${args.subQuestions.join("\n- ")}` : "",
    args.filings.length
      ? `SEC filings (recent):\n${args.filings.map((f) => `- ${f.form} filed ${f.filed} → ${f.url}`).join("\n")}`
      : "No SEC filings available.",
    args.webResults.length
      ? `Web sources (use [n] for inline cites):\n${args.webResults.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n  ${(r.text || "").slice(0, 600)}`).join("\n\n")}`
      : "",
  ].filter(Boolean).join("\n\n");

  return await llm(model, [
    { role: "system", content: sys },
    { role: "user", content: ctx },
  ], { maxTokens: 2400 });
}

// ---------- Orchestrator ----------

export async function runAgent(ctx: RunContext) {
  await ctx.setReport({ status: "running" });
  await ctx.emit("plan", { msg: "Parsing query and decomposing into sub-questions..." }, "running");

  const p = await plan(ctx.query);
  await ctx.setReport({ ticker: p.ticker, company_name: p.company_name });
  await ctx.emit("plan", { ticker: p.ticker, company: p.company_name, sub_questions: p.sub_questions }, "done");

  let filings: Filing[] = [];
  if (p.ticker) {
    await ctx.emit("edgar", { msg: `Fetching SEC filings for ${p.ticker}...` }, "running");
    filings = await recentFilings(p.ticker);
    await ctx.emit("edgar", { count: filings.length, filings }, "done");
  } else {
    await ctx.emit("edgar", { msg: "No ticker resolved — skipping EDGAR." }, "skipped");
  }

  await ctx.emit("exa", { msg: "Scanning live web via Exa (Airbyte CLI)..." }, "running");
  const webResults: ExaResult[] = [];
  for (const q of p.web_queries.slice(0, 3)) {
    const r = await exaSearch(q, 4);
    webResults.push(...r);
  }
  // dedupe by url
  const seen = new Set<string>();
  const dedup = webResults.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true))).slice(0, 12);
  await ctx.emit("exa", { count: dedup.length, sources: dedup.map((r) => ({ title: r.title, url: r.url })) }, "done");

  await ctx.emit("synth", { msg: `Synthesizing memo with ${ctx.isPro ? "gemini-2.5-pro" : "gemini-2.5-flash"}...` }, "running");
  const memo = await synthesize({
    query: ctx.query,
    company: p.company_name,
    ticker: p.ticker,
    filings,
    webResults: dedup,
    subQuestions: p.sub_questions,
    isPro: ctx.isPro,
  });

  const sources = [
    ...filings.map((f) => ({ kind: "sec", title: `${f.form} · ${f.filed}`, url: f.url })),
    ...dedup.map((r) => ({ kind: "web", title: r.title, url: r.url })),
  ];

  await ctx.setReport({ status: "done", memo_md: memo, sources });
  await ctx.emit("done", { tokens: memo.length, sources: sources.length }, "done");
}
