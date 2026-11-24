import { Component, Suspense, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";
import { Page } from "@/components/Chrome";
import { LoadError, Loading } from "@/components/LoadState";

// WebKit can retain a failed module preload across a reload. Refresh this
// page's preloaded modules, then ask the host for the current app version.
async function reloadScreen() {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"]');
  await Promise.allSettled(Array.from(links, async ({ href }) => {
    if (new URL(href).origin !== window.location.origin) return;
    const response = await fetch(href, { cache: "reload" });
    if (response.ok) await response.arrayBuffer();
  }));
  window.location.reload();
}

class ScreenErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Page focusKey="screen-error">
          <LoadError onRetry={reloadScreen} />
        </Page>
      );
    }
    return this.props.children;
  }
}

export function SecondaryScreen() {
  const { pathname } = useLocation();
  return (
    <ScreenErrorBoundary key={pathname}>
      <Suspense fallback={
        <Page focusKey="screen-loading" busy>
          <Loading />
        </Page>
      }>
        <Outlet />
      </Suspense>
    </ScreenErrorBoundary>
  );
}
