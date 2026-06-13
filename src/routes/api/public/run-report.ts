import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/run-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.AGENT_RUNNER_SECRET;
        if (!expected) {
          console.error("AGENT_RUNNER_SECRET is not set; rejecting run-report request.");
          return new Response("server misconfigured", { status: 500 });
        }
        const got = request.headers.get("x-runner-secret");
        if (got !== expected) return new Response("forbidden", { status: 403 });

        let body: { reportId?: string };
        try { body = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const reportId = body.reportId;
        if (!reportId) return new Response("missing reportId", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runAgent } = await import("@/lib/agent-runtime.server");

        const { data: report } = await supabaseAdmin
          .from("reports")
          .select("id, user_id, query, status")
          .eq("id", reportId)
          .maybeSingle();
        if (!report) return new Response("not found", { status: 404 });
        if (report.status !== "queued") return new Response("not queued", { status: 409 });

        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("plan")
          .eq("id", report.user_id)
          .maybeSingle();
        const isPro = (prof?.plan ?? "free") === "pro";

        try {
          await runAgent({
            reportId: report.id,
            query: report.query,
            isPro,
            emit: async (step, payload, status = "info") => {
              await supabaseAdmin.from("report_events").insert({
                report_id: report.id, step, status, payload: payload as any,
              });
            },
            setReport: async (patch) => {
              await supabaseAdmin.from("reports").update(patch as any).eq("id", report.id);
            },
          });
        } catch (err: any) {
          await supabaseAdmin.from("reports").update({ status: "error", error: String(err?.message || err) }).eq("id", report.id);
          await supabaseAdmin.from("report_events").insert({ report_id: report.id, step: "error", status: "error", payload: { message: String(err?.message || err) } });
          return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});
