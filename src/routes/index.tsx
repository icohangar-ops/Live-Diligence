import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, FileSearch, Globe2, Sparkles, ShieldCheck, Zap, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Diligence — agentic research memos in 60 seconds" },
      { name: "description", content: "An autonomous research agent that fuses SEC EDGAR filings with real-time web signals (Exa) and writes you an institutional-grade diligence memo." },
      { property: "og:title", content: "Live Diligence" },
      { property: "og:description", content: "Autonomous diligence memos from SEC + the live web." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Logos />
      <How />
      <Stack />
      <Pricing />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-display font-semibold">L</div>
          <span className="font-display text-lg">Live Diligence</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#stack" className="hover:text-foreground">Stack</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">Launch agent</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber/20 blur-[160px]" />
      <div className="relative mx-auto max-w-5xl px-6 pb-28 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          Built for SuperAI · NEXT Hackathon
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-6 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl"
        >
          Diligence at the speed
          <br />
          of the <span className="bg-[image:var(--grad-amber)] bg-clip-text text-transparent italic">live web.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          An autonomous research agent that fuses SEC EDGAR filings with real-time signals from
          Exa, then writes you an institutional-grade memo in under a minute.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to="/auth" className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-[0_0_40px_-10px_oklch(0.82_0.16_78_/_0.6)] hover:opacity-90">
            Run a free memo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <a href="#how" className="rounded-md border border-border px-6 py-3 text-base text-foreground hover:bg-accent">See how it works</a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mt-20 max-w-4xl"
        >
          <TerminalDemo />
        </motion.div>
      </div>
    </section>
  );
}

function TerminalDemo() {
  const steps = [
    { t: "plan", c: "Parsed query → ticker NVDA · 6 sub-questions queued" },
    { t: "edgar", c: "Pulled 10-K (2025-02-21) · 10-Q (2025-08-28) · 4 recent 8-Ks" },
    { t: "exa", c: "Live web scan · 28 sources · filtered to 12 high-signal" },
    { t: "synth", c: "Drafting memo · Thesis · Risks · Catalysts · Sources" },
    { t: "done", c: "Memo ready · 2,340 tokens · 14.2s" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border bg-background/50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">agent.trace · NVDA</span>
        <span className="font-mono text-[11px] text-success">● live</span>
      </div>
      <div className="space-y-2 p-5 text-left font-mono text-sm">
        {steps.map((s, i) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.18, duration: 0.4 }}
            className="flex items-start gap-3"
          >
            <span className="mt-0.5 inline-flex w-16 shrink-0 justify-center rounded bg-amber/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber">{s.t}</span>
            <span className="text-muted-foreground"><span className="text-foreground">→</span> {s.c}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Logos() {
  return (
    <div className="border-y border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-6 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>Powered by</span>
        <span className="text-foreground/80">SEC EDGAR</span>
        <span>·</span>
        <span className="text-foreground/80">Exa</span>
        <span>·</span>
        <span className="text-foreground/80">Stripe</span>
        <span>·</span>
        <span className="text-foreground/80">AWS Bedrock</span>
        <span>·</span>
        <span className="text-foreground/80">Vercel</span>
      </div>
    </div>
  );
}

function How() {
  const items = [
    { icon: Sparkles, t: "Plan", d: "A planner LLM resolves your query to a ticker and decomposes it into sub-questions: thesis, risks, catalysts, competitive position." },
    { icon: FileSearch, t: "Read filings", d: "Pulls the latest 10-K, 10-Q and 8-Ks directly from SEC EDGAR — the source of truth." },
    { icon: Globe2, t: "Scan the live web", d: "Exa searches for current news, expert posts, and competitor signals — the things filings miss." },
    { icon: LineChart, t: "Synthesize", d: "A reasoning model fuses everything into a cited memo: Thesis · Financials · Risks · Catalysts · Sources." },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">How it works</p>
        <h2 className="mt-3 font-display text-4xl">Four steps. One agent. Sixty seconds.</h2>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it.t}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-amber/15 text-amber"><it.icon className="h-4 w-4" /></div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">step 0{i+1}</span>
            </div>
            <h3 className="mt-4 font-display text-xl">{it.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section id="stack" className="border-y border-border/60 bg-card/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Partner stack</p>
          <h2 className="mt-3 font-display text-4xl">Built on the NEXT partner rails.</h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Every component is intentional: <span className="text-foreground">AWS Bedrock</span> for
            reasoning, <span className="text-foreground">Exa</span> for live web,
            <span className="text-foreground"> Stripe</span> for monetization,
            and <span className="text-foreground">Vercel</span> for global edge delivery.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { t: "AWS", d: "Bedrock + Lambda agent runtime" },
            { t: "Exa", d: "Real-time web search & contents API" },
            { t: "Stripe", d: "Subscriptions + usage metering" },
            { t: "Vercel", d: "Edge-rendered React + server functions" },
          ].map((s) => (
            <div key={s.t} className="rounded-lg border border-border bg-card p-5">
              <div className="font-display text-2xl">{s.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Pricing</p>
        <h2 className="mt-3 font-display text-4xl">Free to try. Pro when you scale.</h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-3xl gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-7">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Free</div>
          <div className="mt-3 font-display text-5xl">$0</div>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 text-amber" /> 3 memos / month</li>
            <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 text-amber" /> SEC + Exa fusion</li>
            <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 text-amber" /> Markdown export</li>
          </ul>
          <Link to="/auth" className="mt-7 inline-flex w-full justify-center rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Start free</Link>
        </div>
        <div className="relative rounded-xl border border-amber/40 bg-card p-7 glow-amber">
          <div className="absolute -top-3 left-7 rounded-full bg-amber px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-foreground">Pro</div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Pro</div>
          <div className="mt-3 font-display text-5xl">$19<span className="text-base text-muted-foreground">/mo</span></div>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-amber" /> Unlimited memos</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-amber" /> Deeper synthesis (gemini-2.5-pro)</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-amber" /> Priority agent runtime</li>
          </ul>
          <Link to="/auth" className="mt-7 inline-flex w-full justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Go Pro</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 font-mono text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Live Diligence · Built for SuperAI NEXT Hackathon</span>
        <span>Not investment advice. Demo product.</span>
      </div>
    </footer>
  );
}
