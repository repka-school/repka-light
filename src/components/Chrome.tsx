import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { useFocusHeading } from "@/ui/hooks/useFocusHeading";
import { Picture } from "@/ui/pictures/Picture";
import { LevelBadge } from "@/components/LevelBadge";
import { useMemoryOnly, useSaved } from "@/store/store";
import { downloadBackup } from "@/ui/lib/downloadBackup";
import { t } from "@/strings";

// The header, the same on every screen: the brand, which leads to the index
// page, the tagline, links to the course list and the homestead, the
// learner's level, and their picture and nickname, which lead to the profile.
export function SiteHeader() {
  const { profile } = useSaved();
  const memoryOnly = useMemoryOnly();
  const name = profile.name || t.guest;
  return (
    <>
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
          <NavLink className="header-link" to="/homestead" id="nav-homestead">
            {t.navHomestead}
          </NavLink>
          <LevelBadge />
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
      {memoryOnly && <p role="status" className="storage-notice">
        {t.memoryOnly} <button type="button" onClick={downloadBackup}>{t.backupExport}</button>
      </p>}
    </>
  );
}

// The course content is CC BY-NC-SA 4.0 (courses/LICENSE.md), the code MIT (LICENSE).
const CONTENT_LICENSE = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru";
const CODE_LICENSE = "https://github.com/repka-school/repka-light/blob/main/LICENSE";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>{t.footerNote}</span>
      {__ANALYTICS__ && <span id="footer-analytics">{t.footerAnalytics}</span>}
      <span className="footer-license">
        {t.footerContent}:{" "}
        <a rel="license" href={CONTENT_LICENSE}>
          CC BY-NC-SA 4.0
        </a>{" "}
        · {t.footerCode}:{" "}
        <a rel="license" href={CODE_LICENSE}>
          MIT
        </a>
      </span>
    </footer>
  );
}

export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <p className={className ? `eyebrow ${className}` : "eyebrow"}>{children}</p>;
}

/** The chrome of every screen but a running lesson; focus moves to the heading when `focusKey` changes. */
export function Page({ children, busy = false, focusKey, className }: { children: ReactNode; busy?: boolean; focusKey: string; className?: string }) {
  useFocusHeading(focusKey);
  return (
    <>
      <SiteHeader />
      <main id="app" className={className} aria-busy={busy}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
