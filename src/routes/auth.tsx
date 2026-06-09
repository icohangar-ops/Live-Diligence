import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · Live Diligence" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast.success("Account created. Welcome.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (e: any) {
      toast.error(e.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display font-semibold">L</div>
          <span className="font-display text-lg">Live Diligence</span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-card)]"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">{mode === "signin" ? "Welcome back" : "Get started"}</p>
          <h1 className="mt-2 font-display text-3xl">{mode === "signin" ? "Sign in." : "Create account."}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Email and password, nothing more.</p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Password</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber"
              />
            </div>
            <button type="submit" disabled={busy} className="mt-2 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "No account? Create one →" : "Have an account? Sign in →"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
