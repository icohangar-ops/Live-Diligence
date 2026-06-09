import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Reports ----------

export const startReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ query: z.string().min(2).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Enforce free-tier quota
    const month = new Date().toISOString().slice(0, 7);
    const { data: prof } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
    const plan = prof?.plan ?? "free";
    if (plan === "free") {
      const { data: u } = await supabase.from("usage").select("reports_run").eq("user_id", userId).eq("month", month).maybeSingle();
      if ((u?.reports_run ?? 0) >= 3) {
        throw new Error("Free tier limit reached (3 memos / month). Upgrade to Pro for unlimited.");
      }
    }

    const { data: report, error } = await supabase
      .from("reports")
      .insert({ user_id: userId, query: data.query, status: "queued" })
      .select("id")
      .single();
    if (error || !report) throw new Error(error?.message || "Failed to create report");

    // Bump usage (admin via service role; user can't write to usage)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existingUsage } = await supabaseAdmin
      .from("usage").select("reports_run").eq("user_id", userId).eq("month", month).maybeSingle();
    await supabaseAdmin
      .from("usage")
      .upsert(
        { user_id: userId, month, reports_run: (existingUsage?.reports_run ?? 0) + 1 },
        { onConflict: "user_id,month" },
      );

    // Fire-and-forget kick to the public runner route. We don't await.
    const origin = process.env.PUBLIC_APP_URL || "";
    const runnerSecret = process.env.AGENT_RUNNER_SECRET || "dev-secret";
    const url = `${origin}/api/public/run-report`;
    // Best-effort; if origin not set, the route is fetched by host header from incoming request.
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const host = req.headers.get("host");
      const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0];
      const base = origin || (host ? `${proto}://${host}` : "");
      fetch(`${base}/api/public/run-report`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-runner-secret": runnerSecret },
        body: JSON.stringify({ reportId: report.id }),
      }).catch(() => {});
    } catch {
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-runner-secret": runnerSecret },
        body: JSON.stringify({ reportId: report.id }),
      }).catch(() => {});
    }

    return { id: report.id };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, query, ticker, company_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { reports: data ?? [] };
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Report not found");
    const { data: events } = await context.supabase
      .from("report_events")
      .select("id, step, status, payload, created_at")
      .eq("report_id", data.id)
      .order("created_at", { ascending: true });
    return { report, events: events ?? [] };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const month = new Date().toISOString().slice(0, 7);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, display_name, plan, stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: usage } = await context.supabase
      .from("usage")
      .select("reports_run")
      .eq("user_id", context.userId)
      .eq("month", month)
      .maybeSingle();
    return {
      profile: profile ?? { id: context.userId, email: null, display_name: null, plan: "free" as const, stripe_customer_id: null },
      usageThisMonth: usage?.reports_run ?? 0,
    };
  });
