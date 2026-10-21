import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Shell } from "@/components/nl/Shell";
import { UpdateBanner } from "@/components/nl/UpdateBanner";
import { registerServiceWorker } from "@/lib/pwa";
import { useSyncRunner } from "@/data/sync-runner";
import { Toaster } from "@/components/ui/sonner";
import { ScopeGate } from "@/data/account";
import { useScope } from "@/data/scope-context";
import { useAccountProfile } from "@/data/account-profile";
import { getMeta, setMeta } from "@/data/db";
import { useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { DataProvider, useData, useProfile } from "@/data/hooks";
import { THEME_BOOT, applyTheme, getThemePref } from "@/lib/theme";
import { useEffect } from "react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { title: "VAYVOR" },
      {
        name: "description",
        content:
          "One flexible plan for training, nutrition, focus, routines and optional faith support.",
      },
      { name: "theme-color", content: "#101114" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "VAYVOR" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],

    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ScopeGate fallback={<div aria-busy className="min-h-dvh" />}>
        <DataProvider>
          <Gate />
          <Toaster position="top-center" />
        </DataProvider>
      </ScopeGate>
    </QueryClientProvider>
  );
}

const BARE = /^\/(welcome|auth|onboarding|dev)(\/|$)/;

function Gate() {
  const { ready, error, report } = useData();
  const scope = useScope();
  const auth = useAuth();
  const acct = useAccountProfile();
  const { profile } = useProfile();
  const loc = useLocation();
  const nav = useNavigate();
  useSyncRunner();
  useEffect(() => {
    applyTheme(getThemePref());
    registerServiceWorker();
  }, []);

  const bare = BARE.test(loc.pathname);

  // Signed in but no social profile yet: finish onboarding first (never while offline, where we can't know).
  useEffect(() => {
    if (!auth.user || acct.state.status !== "missing" || bare) return;
    nav({ to: "/onboarding", replace: true });
  }, [auth.user, acct.state.status, bare, nav]);

  // A password-recovery link must lead to choosing a new password.
  useEffect(() => {
    if (auth.recovery && loc.pathname !== "/auth/reset") nav({ to: "/auth/reset", replace: true });
  }, [auth.recovery, loc.pathname, nav]);

  // First visit as a brand-new guest on a build with accounts: show the welcome once.
  useEffect(() => {
    if (!isSupabaseConfigured || !ready || scope.kind !== "guest" || bare || report?.seeded) return;
    void getMeta<boolean>("welcome:seen").then((seen) => {
      if (!seen) nav({ to: "/welcome", replace: true });
    });
  }, [ready, scope, bare, report, nav]);

  // New guests get the same real setup as accounts. Legacy owners are never interrupted.
  useEffect(() => {
    if (
      !ready ||
      bare ||
      report?.seeded ||
      !profile ||
      profile.setup.completed ||
      profile.setup.skipped
    )
      return;
    void getMeta<boolean>("welcome:seen").then((seen) => {
      if (!isSupabaseConfigured || seen) nav({ to: "/onboarding", replace: true });
    });
  }, [ready, bare, report, profile, nav]);

  // Remember who this on-device storage belongs to (shown when it's a signed-out, remembered account).
  useEffect(() => {
    if (scope.kind !== "user" || !auth.user) return;
    void setMeta("scope:label", {
      email: auth.user.email,
      username: acct.state.status === "ready" ? acct.state.profile.username : undefined,
    });
  }, [scope, auth.user, acct.state]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold">Storage isn't available</h1>
          <p className="mt-2 text-muted-foreground">
            VAYVOR saves to your browser's local database and couldn't open it ({error}). Private
            browsing or blocked site data can cause this.
          </p>
        </div>
      </div>
    );
  }
  if (bare) return ready ? <Outlet /> : <div aria-busy className="min-h-dvh" />;
  return (
    <Shell>
      <UpdateBanner />
      {ready ? <Outlet /> : <div aria-busy className="h-64 animate-pulse rounded-3xl bg-surface" />}
    </Shell>
  );
}
