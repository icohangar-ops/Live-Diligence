// Stripe Checkout — direct Stripe API (not Airbyte). Webhook stays in stripe-webhook.ts.

export interface CheckoutSessionInput {
  userId: string;
  email: string;
  returnUrl: string;
  productName: string;
  unitAmountCents: number;
}

export interface CheckoutSessionResult {
  url: string;
  id?: string;
}

async function stripeForm(path: string, params: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe ${res.status}: ${text.slice(0, 250)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
  const session = await stripeForm("/checkout/sessions", {
    mode: "subscription",
    success_url: `${input.returnUrl}?upgraded=1`,
    cancel_url: input.returnUrl,
    client_reference_id: input.userId,
    customer_email: input.email || "",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.unitAmountCents),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": input.productName,
    "line_items[0][quantity]": "1",
    "metadata[user_id]": input.userId,
  });
  const url = typeof session.url === "string" ? session.url : "";
  if (!url) throw new Error("Stripe checkout session missing url");
  return { url, id: typeof session.id === "string" ? session.id : undefined };
}
