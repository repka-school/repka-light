import { Link } from "react-router";
import { ArrowRight, BookOpen, Bookmark, Lightbulb, ListChecks } from "lucide-react";
import homesteadPreview from "@/ui/assets/homestead-preview.webp";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Eyebrow, Page } from "@/components/Chrome";
import { SampleCards } from "@/components/SampleCards";
import { reach, start } from "@/content/landing";
import { loadIndex, useLoaded } from "@/content/load";
import { useSaved } from "@/store/store";
import { t } from "@/strings";

const stepIcons = [BookOpen, Lightbulb, ListChecks, Bookmark];

/**
 * The index page: what the site is, a way into the courses, and a few sample
 * tasks. The main button leads back into a started course, into the only
 * course, or to the course list; until the course list has loaded it leads
 * to the list, so it is never a dead button.
 */
export function LandingScreen() {
  const index = useLoaded("index", loadIndex);
  const saved = useSaved();
  const courses = index.data?.courses;
  const next = courses ? start(courses, saved) : null;
  const total = courses ? reach(courses) : null;
  const to = next && next.kind !== "choose" ? `/course/${encodeURIComponent(next.course.slug)}` : "/courses";
  return (
    <Page focusKey="landing">
      <section className="landing-layout">
        <div className="landing-text">
          <Eyebrow>{t.landingEyebrow}</Eyebrow>
          <PageHeading>{t.landingTitle}</PageHeading>
          <p className="lead">{t.landingLead}</p>
          {next?.kind === "continue" && <p className="landing-line">{t.landingCurrent(next.course.title)}</p>}
          <div className="landing-actions">
            <Button asChild className="primary">
              <Link to={to} id="landing-start">
                {next?.kind === "continue" ? t.landingContinue : t.landingStart}
              </Link>
            </Button>
            {/* Left out when the main button already leads to the list. */}
            {next?.kind !== "choose" && (
              <Button asChild variant="outline" className="secondary">
                <Link to="/courses" id="landing-courses">
                  {t.landingAll}
                </Link>
              </Button>
            )}
          </div>
          <p className="landing-note">{t.landingNote}</p>
          {total && <p className="landing-reach">{t.landingReach(total.courses, total.tasks, total.lessons, total.grades)}</p>}
        </div>
        <SampleCards />
      </section>
      <section className="landing-garden" aria-labelledby="landing-garden-title">
        <div>
          <h2 id="landing-garden-title">{t.landingGardenTitle}</h2>
          <p>{t.landingGardenText}</p>
          <Link className="landing-garden-link" to="/homestead">
            {t.landingGardenOpen}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <img src={homesteadPreview} alt="" width="700" height="476" loading="lazy" />
      </section>
      <section className="landing-steps" aria-labelledby="landing-steps-title">
        <h2 id="landing-steps-title">{t.landingStepsTitle}</h2>
        <ul>
          {t.landingSteps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <li key={step.title}>
                <Icon aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </Page>
  );
}
