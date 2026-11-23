import { Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Page } from "@/components/Chrome";
import { ListSwitch } from "@/components/ListSwitch";
import { LoadError, Loading } from "@/components/LoadState";
import { TopicRing } from "@/components/TopicRing";
import { loadIndex, useLoaded } from "@/content/load";
import type { ProgramSummary } from "@/content/types";
import { t } from "@/strings";

export const programPath = (slug: string) => `/program/${encodeURIComponent(slug)}`;

/** The program list: every program, each as a card with its ring of topics. */
export function ProgramsScreen() {
  const index = useLoaded("index", loadIndex);
  const programs = index.data?.programs;
  return (
    <Page focusKey="programs" busy={index.loading}>
      <section className="courses-page">
        <ListSwitch />
        <div className="courses-heading">
          <PageHeading>{t.programsTitle}</PageHeading>
          <p className="courses-intro">{t.programsIntro}</p>
        </div>
        {index.loading && <Loading />}
        {index.error && <LoadError onRetry={index.retry} />}
        {programs?.length === 0 && <p className="muted">{t.programsEmpty}</p>}
        {!!programs?.length && (
          <ul className="catalog-cards">
            {programs.map((program) => (
              <ProgramCard key={program.slug} program={program} />
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function ProgramCard({ program }: { program: ProgramSummary }) {
  const to = programPath(program.slug);
  const grades = t.grades(program.grades);
  return (
    <li className="catalog-card" data-program={program.slug}>
      <span className="course-cover">
        <TopicRing topics={program.topics} />
      </span>
      <span className="catalog-card-body">
        <span className="catalog-card-title">
          {/* Its ::after stretches over the whole card, so the card is one big target. */}
          <Link className="course-title" to={to}>
            {program.title}
          </Link>
        </span>
        {program.description && <span className="catalog-card-description">{program.description}</span>}
        {grades && (
          <span className="catalog-card-meta">
            <span className="catalog-card-item">
              <GraduationCap aria-hidden="true" />
              {grades}
            </span>
          </span>
        )}
        <span className="program-card-note">{t.programNoLessons}</span>
        <Button asChild variant="outline" className="catalog-card-action secondary">
          <Link to={to} aria-label={`${t.openPlan}: ${program.title}`}>
            {t.openPlan}
          </Link>
        </Button>
      </span>
    </li>
  );
}
