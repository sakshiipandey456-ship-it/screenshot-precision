import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  Flag,
  HeartPulse,
  Lock,
  Radar,
  ReceiptText,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import heroImg from "@/assets/hero-compass.jpg";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CashCompass AI — Take Control of Your Money with AI" },
      {
        name: "description",
        content:
          "Track expenses, understand spending patterns, build smarter budgets and reach savings goals with your personal AI financial assistant.",
      },
      { property: "og:title", content: "CashCompass AI — Your Money. Your Goals. Your Direction." },
      {
        property: "og:description",
        content: "An AI-powered personal finance assistant built for students and young adults.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BrainCircuit, title: "AI Financial Insights", text: "Compass AI explains where your money goes and why, in plain words." },
  { icon: ReceiptText, title: "Smart Expense Tracking", text: "Log expenses and income in seconds. Search, filter and sort anything." },
  { icon: Wallet, title: "Intelligent Budget Planning", text: "Set category limits and get a friendly nudge at 80%." },
  { icon: Target, title: "Savings Goal Tracking", text: "Save for a laptop or a trip and see an estimated finish date." },
  { icon: TrendingUp, title: "Future Spending Prediction", text: "See next month's likely spending before it happens." },
  { icon: HeartPulse, title: "Financial Health Score", text: "A motivating score for your habits, with tips to improve." },
];

const steps = [
  { title: "Add your expenses", text: "Type them in or scan a receipt." },
  { title: "Let AI analyse your spending", text: "Compass AI looks for patterns in your own data." },
  { title: "Receive personalised insights", text: "Clear explanations and practical suggestions." },
  { title: "Build better habits", text: "Budgets, goals and challenges keep you on track." },
];

const unique = [
  { icon: Radar, title: "Spending anomaly detector", text: "Spots spikes compared with your normal pattern, without false alarms on everyday buys." },
  { icon: CalendarClock, title: "Subscription tracker", text: "Every recharge, bill and app in one list with upcoming reminders." },
  { icon: ScanLine, title: "Receipt scanner", text: "Reads a receipt photo, then lets you confirm before saving." },
  { icon: Flag, title: "Spending challenges", text: "Optional, encouraging habit challenges. No shaming, ever." },
];

const faqs = [
  { q: "Do I need to connect my bank account?", a: "No. CashCompass AI never asks for bank logins or card details. You add transactions yourself, so you stay fully in control." },
  { q: "Is my financial data private?", a: "Yes. Your records are tied to your account and nobody else can see them. Compass AI only receives the summaries it needs to answer you." },
  { q: "What if there's no AI available?", a: "A built-in rule-based analysis still gives you useful insights, so the advisor always works." },
  { q: "Is the health score a credit score?", a: "No. It's a learning tool that reflects your saving and budgeting habits. It doesn't affect any loan or say anything about your worth." },
  { q: "Who is CashCompass AI for?", a: "Students, young adults and anyone managing an allowance or first salary who wants to understand their money better." },
];

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Nav */}
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#why" className="transition-colors hover:text-foreground">Why us</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button variant="hero" asChild>
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-hero" />
        <div className="pointer-events-none absolute inset-0 grid-backdrop" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="size-3.5" /> Your Money. Your Goals. Your Direction.
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Take Control of Your Money with <span className="text-gradient">AI.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Track expenses, understand spending patterns, build smarter budgets, and achieve your savings goals with
              your personal AI financial assistant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/register">
                  Get Started <ArrowRight />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Lock className="size-4 text-success" /> No bank logins</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-success" /> Built for students</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-success" /> Free to start</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
            <img
              src={heroImg}
              alt="A glowing glass compass with orbiting coins, symbolising financial direction"
              width={1280}
              height={1024}
              className="relative w-full rounded-3xl border border-border object-cover shadow-glow animate-float"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Features" title="Everything you need to master your money" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gradient-brand opacity-0 blur-3xl transition-opacity group-hover:opacity-25" />
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="How it works" title="From raw numbers to real direction in four steps" />
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="font-display text-4xl font-bold text-gradient">0{i + 1}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="Why CashCompass AI?" title="Not just how much you spent. Why." />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Ordinary expense trackers</p>
            <ul className="mt-4 space-y-3 text-sm">
              {["Record transactions", "Show a total at month end", "Leave you to figure out the rest"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-muted-foreground">
                  <X className="size-4 text-destructive" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-accent/30 p-6 shadow-glow">
            <p className="text-sm font-medium text-gradient">CashCompass AI</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Explains why you may be overspending",
                "Spots patterns and unusual spikes",
                "Suggests practical ways to save",
                "Predicts next month before it happens",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Check className="size-4 text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {unique.map((u) => (
            <div key={u.title} className="rounded-2xl border border-border bg-card p-5">
              <u.icon className="size-5 text-cyan" />
              <h3 className="mt-3 text-sm font-semibold">{u.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{u.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionTitle eyebrow="Dashboard preview" title="A calm, clear view of your money" />
          <div className="mt-12">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionTitle eyebrow="FAQ" title="Questions, answered" />
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand p-10 text-center shadow-glow sm:p-14">
          <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" />
          <h2 className="relative text-3xl font-bold text-primary-foreground sm:text-4xl">Find your financial direction.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-primary-foreground/85">
            Start tracking today and let Compass AI show you where your money can work harder.
          </p>
          <Button size="xl" variant="secondary" asChild className="relative mt-8">
            <Link to="/register">
              Create your free account <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-xs text-muted-foreground">
              CashCompass AI is an educational money tool. It does not connect to banks, process payments or give
              regulated financial advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CashCompass AI</p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h2>
    </div>
  );
}
