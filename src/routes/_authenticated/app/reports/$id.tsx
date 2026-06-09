import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/agent.functions";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/app/reports/$id")({
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const fetchReport = useServerFn(getReport);

  const q = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport({ data: { id } }),
    refetchInterval: (query) => {
      const s = query.state.data?.report?.status;
      return s === "done" || s === "error" ? false : 1500;
    },
  });

  const report = q.data?.report;
  const events = q.data?.events ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to="/app" className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            {report?.ticker ? `${report.ticker} · ${report.company_name ?? ""}` : "Diligence memo"}
          </p>
          <h1 className="mt-1 font-display text-3xl">{report?.query ?? "Loading..."}</h1>
        </div>
        {report && <StatusBadge status={report.status as any} />}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Memo */}
        <div className="rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-card)] min-h-[400px]">
          {report?.memo_md ? (
            <article className="prose-memo">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.memo_md}</ReactMarkdown>
            </article>
          ) : report?.status === "error" ? (
            <div className="text-destructive">
              <AlertCircle className="mb-2 h-5 w-5" />
              <div className="font-display text-xl">Agent failed</div>
              <p className="mt-2 text-sm text-muted-foreground">{report.error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-amber" />
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em]">agent working...</p>
              <p className="mt-2 max-w-sm text-sm">Filings, web signals, and reasoning are being woven into a memo. Usually 30–60 seconds.</p>
            </div>
          )}
        </div>

        {/* Trace */}
        <aside className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">agent trace</div>
            {report?.status !== "done" && report?.status !== "error" && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber" />}
          </div>
          <ol className="mt-4 space-y-3">
            <AnimatePresence>
              {events.map((e: any) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  className="border-l-2 border-amber/40 pl-3"
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-amber">
                    <span>{e.step}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <EventPayload payload={e.payload} />
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>

          {report?.sources && Array.isArray(report.sources) && report.sources.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">sources</div>
              <ul className="mt-3 space-y-2">
                {(report.sources as any[]).map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-start gap-1.5 text-xs hover:text-amber">
                      <span className="font-mono text-amber/70">[{i + 1}]</span>
                      <span className="line-clamp-2 underline-offset-2 group-hover:underline">{s.title}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function EventPayload({ payload }: { payload: any }) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.msg) return <span>{payload.msg}</span>;
  if (payload.count !== undefined) return <span>{payload.count} items</span>;
  if (payload.ticker) return <span>Ticker: <span className="text-foreground">{payload.ticker}</span></span>;
  if (payload.message) return <span>{payload.message}</span>;
  return null;
}

function StatusBadge({ status }: { status: "queued" | "running" | "done" | "error" }) {
  if (status === "done") return <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 font-mono text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />memo ready</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 font-mono text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />error</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 font-mono text-xs text-amber"><Loader2 className="h-3.5 w-3.5 animate-spin" />{status}</span>;
}
