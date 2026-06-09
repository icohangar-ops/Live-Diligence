import { createFileRoute } from "@tanstack/react-router";

// Stripe webhook. Verifies the Stripe-Signature header against STRIPE_WEBHOOK_SECRET
// using the v1 HMAC-SHA256 scheme.

async function verify(payload: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const raw = await request.text();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let verified = false;
        let evt: any = null;
        let parseError: string | null = null;

        if (secret) {
          verified = await verify(raw, request.headers.get("stripe-signature"), secret);
        }

        try {
          evt = raw ? JSON.parse(raw) : null;
        } catch (e: any) {
          parseError = e?.message ?? "invalid json";
        }

        // Detect payload style: snapshot includes `data.object`, thin events do not.
        const payloadStyle =
          evt && evt.data && evt.data.object ? "snapshot" : evt ? "thin" : "unknown";

        const logBase = {
          source: "stripe",
          event_id: evt?.id ?? null,
          event_type: evt?.type ?? null,
          payload_style: payloadStyle,
          verified,
          payload: evt ?? { raw: raw.slice(0, 2000) },
        };

        if (secret && !verified) {
          await supabaseAdmin.from("webhook_events").insert({
            ...logBase,
            status: "rejected",
            error: "invalid signature",
          });
          return new Response("invalid signature", { status: 401 });
        }

        if (parseError) {
          await supabaseAdmin.from("webhook_events").insert({
            ...logBase,
            status: "error",
            error: parseError,
          });
          return new Response("invalid payload", { status: 400 });
        }

        let status = "received";
        let handlerError: string | null = null;
        try {
          if (evt.type === "checkout.session.completed") {
            const s = evt.data.object;
            const userId = s.client_reference_id || s.metadata?.user_id;
            if (userId) {
              await supabaseAdmin.from("profiles").update({
                plan: "pro",
                stripe_customer_id: s.customer ?? null,
              }).eq("id", userId);
            }
            status = "processed";
          } else if (evt.type === "customer.subscription.deleted") {
            const sub = evt.data.object;
            if (sub.customer) {
              await supabaseAdmin.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", sub.customer);
            }
            status = "processed";
          } else {
            status = "ignored";
          }
        } catch (e: any) {
          status = "error";
          handlerError = e?.message ?? "handler error";
        }

        await supabaseAdmin.from("webhook_events").insert({
          ...logBase,
          status,
          error: handlerError,
        });

        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});
