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
  // timing-safe compare
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
        if (secret) {
          const ok = await verify(raw, request.headers.get("stripe-signature"), secret);
          if (!ok) return new Response("invalid signature", { status: 401 });
        }
        const evt = JSON.parse(raw);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (evt.type === "checkout.session.completed") {
          const s = evt.data.object;
          const userId = s.client_reference_id || s.metadata?.user_id;
          if (userId) {
            await supabaseAdmin.from("profiles").update({
              plan: "pro",
              stripe_customer_id: s.customer ?? null,
            }).eq("id", userId);
          }
        } else if (evt.type === "customer.subscription.deleted") {
          const sub = evt.data.object;
          if (sub.customer) {
            await supabaseAdmin.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", sub.customer);
          }
        }
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});
