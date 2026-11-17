import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { useFocusHeading } from "@/ui/hooks/useFocusHeading";
import { Picture } from "@/ui/pictures/Picture";
import { useSaved } from "@/store/store";
import { t } from "@/strings";

// The header, the same on every screen: the brand, which leads to the index
// page, the tagline, a link to the course list, and the learner's picture
// and nickname, which lead to the profile.
export function SiteHeader() {
  const { profile } = useSaved();
  const name = profile.name || t.guest;
  return (
    <header className="site-header">
      <Link className="brand" to="/" id="brand" aria-label={t.brandLabel}>
        <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true">
          <path d="M20 15C8 10 6 22 12 28l8 8 8-8c6-6 4-18-8-13Z" fill="currentColor" />
          <path d="M20 16C10 14 11 4 11 4s10-1 9 12ZM21 14C19 3 29 2 29 2s4 10-8 12Z" fill="currentColor" />
        </svg>
        <span>
          {t.brand}
          <span className="brand-dot">.</span>
        </span>
      </Link>
      <div className="header-side">
        <span className="header-note">{t.brandNote}</span>
        <NavLink className="header-link" to="/courses" id="nav-courses">
          {t.navCourses}
        </NavLink>
        <Link className="header-profile" to="/profile" id="nav-profile" aria-label={t.profileLabel(name)}>
          <span className="header-user" aria-hidden="true">
            {name}
          </span>
          <span className="avatar-button">
            <Picture of={profile} size={40} />
          </span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>{t.footerNote}</span>
    </footer>
  );
}

export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <p className={className ? `eyebrow ${className}` : "eyebrow"}>{children}</p>;
}

/** The chrome of every screen but a running lesson; focus moves to the heading when `focusKey` changes. */
export function Page({ children, busy = false, focusKey }: { children: ReactNode; busy?: boolean; focusKey: string }) {
  useFocusHeading(focusKey);
  return (
    <>
      <SiteHeader />
      <main id="app" aria-busy={busy}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
