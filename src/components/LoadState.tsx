import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Link } from "react-router";
import { t } from "@/strings";

export function Loading() {
  return (
    <div className="status-card" role="status">
      <span className="spinner" aria-hidden="true" />
      <p className="muted">{t.loading}</p>
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="status-card">
      <PageHeading>{t.loadError}</PageHeading>
      <Button type="button" className="primary" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="status-card">
      <PageHeading>{t.notFound}</PageHeading>
      <Button asChild className="primary">
        <Link to="/courses">{t.toCatalog}</Link>
      </Button>
    </div>
  );
}
