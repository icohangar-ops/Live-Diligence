import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listReports, startReport, getProfile } from "@/lib/agent.functions";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Sparkles, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchList = useServerFn(listReports);
  const fetchProfile = useServerFn(getProfile);
  const startFn = useServerFn(startReport);

  const [q, setQ] = useState("");

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const listQ = useQuery({ queryKey: ["reports"], queryFn: () => fetchList(), refetchInterval: 4000 });

  const start = useMutation({
    mutationFn: (query: string) => startFn({ data: { query } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/app/reports/$id", params: { id: r.id } });
    },
    onError: (e: any) => toast.error(e.message || "Failed to start report"),
  });

  const plan = profileQ.data?.profile.plan ?? "free";
  const used = profileQ.data?.usageThisMonth ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Dashboard</p>
          <h1 className="mt-1 font-display text-4xl">Run a new diligence memo</h1>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
          plan: <span className="text-foreground">{plan}</span>
          {plan === "free" && <> · used {used}/3 this month</>}
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) start.mutate(q.trim()); }}
        className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">prompt</span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='e.g. "Should I be worried about NVDA after the latest 10-Q?"'
          className="mt-2 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground/60"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {["NVDA latest 10-Q analysis", "PLTR competitive moat and risks", "TSLA bull and bear case 2026"].map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">{s}</button>
            ))}
          </div>
          <button type="submit" disabled={start.isPending || !q.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run memo
          </button>
        </div>
      </motion.form>

      <div className="mt-12">
        <h2 className="font-display text-2xl">Recent reports</h2>
        <div className="mt-4 space-y-2">
          {(listQ.data?.reports ?? []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No reports yet. Run your first memo above.
            </div>
          )}
          {(listQ.data?.reports ?? []).map((r) => (
            <Link
              key={r.id} to="/app/reports/$id" params={{ id: r.id }}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-amber/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-sm">{r.query}</span>
                  {r.ticker && <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[10px] text-amber">{r.ticker}</span>}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <StatusPill status={r.status as any} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "queued" | "running" | "done" | "error" }) {
  if (status === "done") return <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] text-success"><CheckCircle2 className="h-3 w-3" />done</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] text-destructive"><AlertCircle className="h-3 w-3" />error</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[10px] text-amber"><Loader2 className="h-3 w-3 animate-spin" />{status}</span>;
}
