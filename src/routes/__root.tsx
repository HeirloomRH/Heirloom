import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "../lib/wallet/wagmi";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader, SiteFooter } from "../components/heirloom/chrome";
import { ConciergeWidget } from "../components/heirloom/concierge-widget";
import { I18nProvider, useT } from "../lib/i18n";

function NotFoundComponent() {
  const t = useT();
  return (
    <main id="main" className="shell empty-state">
      <p className="eyebrow">{t.common.notFound.eyebrow}</p>
      <h1 className="product-title">{t.common.notFound.title}</h1>
      <p>{t.common.notFound.body}</p>
      <Link className="button primary" to="/">
        {t.common.notFound.cta}
      </Link>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t.common.error.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.common.error.body}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.common.error.retry}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t.common.error.goHome}
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Heirloom — A future worth passing on." },
      {
        name: "description",
        content:
          "Build a portfolio. Write your wishes. Give the people you love a future to grow into. Explore the Heirloom programmable trust vault frontend.",
      },
      { name: "author", content: "Heirloom" },
      { property: "og:title", content: "Heirloom — A future worth passing on." },
      {
        property: "og:description",
        content:
          "Build a portfolio. Write your wishes. Give the people you love a future to grow into.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/brand/heirloom-symbol.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

function SkipLink() {
  const t = useT();
  return (
    <a className="skip" href="#main">
      {t.common.skipToContent}
    </a>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={lightTheme({
            accentColor: "#152c41",
            accentColorForeground: "#f1ede5",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <SkipLink />
          <SiteHeader />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <SiteFooter />
          <ConciergeWidget />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

