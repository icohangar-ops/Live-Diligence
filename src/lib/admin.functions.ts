import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    eventType?: string;
    payloadStyle?: string;
    verified?: boolean | null;
    page?: number;
    pageSize?: number;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check admin role server-side
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, data.pageSize ?? 25));
    const from = (page - 1) * pageSize;
    const to = from + pageSize; // fetch one extra to detect hasMore

    let query = supabase
      .from("webhook_events")
      .select("id, source, event_id, event_type, payload_style, verified, status, error, payload, created_at")
      .order("created_at", { ascending: false });

    if (data.eventType) {
      query = query.ilike("event_type", `%${data.eventType}%`);
    }
    if (data.payloadStyle) {
      query = query.eq("payload_style", data.payloadStyle);
    }
    if (data.verified !== null && data.verified !== undefined) {
      query = query.eq("verified", data.verified);
    }

    const { data: rows, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const hasMore = (rows ?? []).length > pageSize;
    const events = (rows ?? []).slice(0, pageSize);

    return { events, hasMore, page, pageSize };
  });
