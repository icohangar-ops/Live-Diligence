import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    eventType?: string;
    payloadStyle?: string;
    verified?: boolean | null;
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

    let query = supabase
      .from("webhook_events")
      .select("id, source, event_id, event_type, payload_style, verified, status, error, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data.eventType) {
      query = query.ilike("event_type", `%${data.eventType}%`);
    }
    if (data.payloadStyle) {
      query = query.eq("payload_style", data.payloadStyle);
    }
    if (data.verified !== null && data.verified !== undefined) {
      query = query.eq("verified", data.verified);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { events: rows ?? [] };
  });
