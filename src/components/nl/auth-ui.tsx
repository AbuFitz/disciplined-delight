import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { BRAND } from "@/lib/brand";

/** Bare layout for account screens (no app navigation). */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_38%),var(--background)] px-4 py-5 sm:px-7 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-surface shadow-2xl sm:min-h-[calc(100dvh-4rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden border-r border-line bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-current/15" />
          <div className="absolute -bottom-36 -left-20 size-96 rounded-full border border-current/10" />
          <Link
            to="/"
            aria-label="VAYVOR, home"
            className="relative inline-flex min-h-11 items-center"
          >
            <Wordmark className="text-[1.35rem]" />
          </Link>
          <div className="relative max-w-sm">
            <p className="font-display text-4xl font-semibold leading-tight">
              Build a routine that fits your actual life.
            </p>
            <p className="mt-4 text-sm leading-relaxed opacity-80">
              Training, food, focus, reflection and optional faith tools—choose only what is useful
              to you.
            </p>
          </div>
          <p className="relative text-xs opacity-70">Private by default · Works as a guest</p>
        </aside>
        <main className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-14">
          <Link
            to="/"
            aria-label="VAYVOR, home"
            className="mb-3 inline-flex min-h-11 items-center lg:hidden"
          >
            <Wordmark className="text-[1.35rem]" />
          </Link>
          <p className="eyebrow mb-5" aria-label={`Pronounced ${BRAND.pronunciation}`}>
            {BRAND.pronunciation} · {BRAND.tagline}
          </p>
          <h1 className="display-title text-[2.4rem] sm:text-[3rem]">{title}</h1>
          {intro && <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">{intro}</p>}
          <div className="mt-7 grid gap-4">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.19 3.31v2.75h3.54c2.07-1.91 3.25-4.72 3.25-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.88 0-5.31-1.95-6.18-4.56H2.16v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.82 14.08A6.6 6.6 0 0 1 5.47 12c0-.72.13-1.42.35-2.08V7.08H2.16A11 11 0 0 0 1 12c0 1.77.42 3.45 1.16 4.92l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.16 7.08l3.66 2.84C6.69 7.33 9.12 5.38 12 5.38Z"
      />
    </svg>
  );
}
