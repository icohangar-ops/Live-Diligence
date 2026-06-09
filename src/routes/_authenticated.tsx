import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display font-semibold">L</div>
            <span className="font-display text-lg">Live Diligence</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">Reports</Link>
            <Link to="/billing" className="text-sm text-muted-foreground hover:text-foreground">Billing</Link>
            <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">{email}</span>
            <button onClick={signOut} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">Sign out</button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
