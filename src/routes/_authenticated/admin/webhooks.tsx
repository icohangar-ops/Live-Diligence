import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { listWebhookEvents, exportWebhookEvents, exportWebhookEventsJSON } from "@/lib/admin.functions";
import { CheckCircle2, XCircle, ShieldAlert, ChevronRight, RefreshCw, Search, X, ChevronLeft, Download, FileJson } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/webhooks")({
  component: WebhookEventsPage,
});

function WebhookEventsPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [payloadStyleFilter, setPayloadStyleFilter] = useState<"" | "snapshot" | "thin">("");
  const [verifiedFilter, setVerifiedFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingJSON, setExportingJSON] = useState(false);

  const filters = useMemo(() => ({
    eventType: eventTypeFilter || undefined,
    payloadStyle: payloadStyleFilter || undefined,
    verified: verifiedFilter === "" ? undefined : verifiedFilter === "true",
    page,
    pageSize,
  }), [eventTypeFilter, payloadStyleFilter, verifiedFilter, page, pageSize]);

  const exportFilters = useMemo(() => ({
    eventType: eventTypeFilter || undefined,
    payloadStyle: payloadStyleFilter || undefined,
    verified: verifiedFilter === "" ? undefined : verifiedFilter === "true",
  }), [eventTypeFilter, payloadStyleFilter, verifiedFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [eventTypeFilter, payloadStyleFilter, verifiedFilter]);

  const fetchFn = useServerFn(listWebhookEvents);
  const q = useQuery({
    queryKey: ["admin", "webhook-events", filters],
    queryFn: () => fetchFn({ data: filters }),
    refetchInterval: 10_000,
  });
  const exportCsvFn = useServerFn(exportWebhookEvents);
  const exportJsonFn = useServerFn(exportWebhookEventsJSON);
  const [openId, setOpenId] = useState<string | null>(null);

  const events = q.data?.events ?? [];
  const hasMore = q.data?.hasMore ?? false;
  const hasActiveFilters = eventTypeFilter || payloadStyleFilter || verifiedFilter;

  async function handleExportCSV() {
    setExportingCSV(true);
    try {
      const { events } = await exportCsvFn({ data: exportFilters });
      downloadCSV(events, `webhook-events-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExportingCSV(false);
    }
  }

  async function handleExportJSON() {
    setExportingJSON(true);
    try {
      const { events } = await exportJsonFn({ data: exportFilters });
      downloadJSON(events, `webhook-events-${new Date().toISOString().slice(0, 10)}.json`);
    } finally {
      setExportingJSON(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Admin</p>
          <h1 className="mt-1 font-display text-4xl">Webhook events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Incoming Stripe events, payload style, and signature verification results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            disabled={exportingJSON}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <FileJson className={`h-4 w-4 ${exportingJSON ? "animate-bounce" : ""}`} />
            {exportingJSON ? "Exporting…" : "Export JSON"}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${exportingCSV ? "animate-bounce" : ""}`} />
            {exportingCSV ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {q.isError && (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4" />
          {(q.error as Error).message}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by event type…"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:border-amber focus:outline-none"
          />
        </div>
        <select
          value={payloadStyleFilter}
          onChange={(e) => setPayloadStyleFilter(e.target.value as any)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-amber focus:outline-none"
        >
          <option value="">All payload styles</option>
          <option value="snapshot">Snapshot</option>
          <option value="thin">Thin</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as any)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-amber focus:outline-none"
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-amber focus:outline-none"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setEventTypeFilter("");
              setPayloadStyleFilter("");
              setVerifiedFilter("");
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/30 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Payload</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && !q.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No webhook events match your filters.
                </td>
              </tr>
            )}
            {events.map((e: any) => {
              const isOpen = openId === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setOpenId(isOpen ? null : e.id)}
                    className="cursor-pointer border-t border-border hover:bg-accent/40"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{e.event_type ?? "—"}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{e.event_id ?? "no id"}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {e.payload_style}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {e.verified ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-4 w-4" /> valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" /> invalid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={e.status} />
                      {e.error && (
                        <div className="mt-0.5 truncate font-mono text-[11px] text-destructive" title={e.error}>
                          {e.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="max-h-96 overflow-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} · {events.length} events
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); setOpenId(null); }}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => { setPage((p) => p + 1); setOpenId(null); }}
            disabled={!hasMore}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 text-sm text-muted-foreground">
        <Link to="/app" className="hover:text-foreground">← Back to dashboard</Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "processed" ? "bg-success/15 text-success"
    : status === "ignored" ? "bg-muted text-muted-foreground"
    : status === "rejected" ? "bg-destructive/15 text-destructive"
    : status === "error" ? "bg-destructive/15 text-destructive"
    : "bg-amber/15 text-amber";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  );
}

function downloadCSV(rows: any[], filename: string) {
  const headers = ["created_at", "source", "event_id", "event_type", "payload_style", "verified", "status", "error"];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(rows: any[], filename: string) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
