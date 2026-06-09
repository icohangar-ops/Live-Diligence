import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PRO_PRICE_AMOUNT = "1900"; // $19.00 in cents
const PRO_PRODUCT_NAME = "Live Diligence Pro";

async function stripeForm(path: string, params: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Stripe ${res.status}: ${t.slice(0, 250)}`);
  }
  return res.json();
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ returnUrl: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("email, stripe_customer_id").eq("id", userId).maybeSingle();

    const session = await stripeForm("/checkout/sessions", {
      "mode": "subscription",
      "success_url": `${data.returnUrl}?upgraded=1`,
      "cancel_url": data.returnUrl,
      "client_reference_id": userId,
      "customer_email": prof?.email || "",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": PRO_PRICE_AMOUNT,
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": PRO_PRODUCT_NAME,
      "line_items[0][quantity]": "1",
      "metadata[user_id]": userId,
    });

    return { url: session.url as string };
  });
