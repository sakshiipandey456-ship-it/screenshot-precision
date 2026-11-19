import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-glow",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)} aria-label="CashCompass AI home">
      <LogoMark />
      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight">
          CashCompass<span className="text-gradient"> AI</span>
        </span>
      )}
    </Link>
  );
}
