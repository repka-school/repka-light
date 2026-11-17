import { Link } from "react-router";
import { BookOpen, FileText, GraduationCap } from "lucide-react";
import { PageHeading } from "@/ui/components/PageHeading";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Progress } from "@/ui/components/ui/progress";
import { Page } from "@/components/Chrome";
import { LoadError, Loading } from "@/components/LoadState";
import { loadIndex, useLoaded } from "@/content/load";
import { splitCourses, type CourseProgress } from "@/content/progress";
import { useSaved } from "@/store/store";
import { t } from "@/strings";

/**
 * The course list: every course. The courses the learner has answered
 * anything in come first, in their own section, each with its progress.
 */
export function CatalogScreen() {
  const index = useLoaded("index", loadIndex);
  const { results } = useSaved();
  const { started, others } = splitCourses(index.data?.courses ?? [], results);
  return (
    <Page focusKey="catalog" busy={index.loading}>
      <section className="courses-page">
        <div className="courses-heading">
          <PageHeading>{t.catalogTitle}</PageHeading>
          <p className="courses-intro">{t.catalogIntro}</p>
        </div>
        {index.loading && <Loading />}
        {index.error && <LoadError onRetry={index.retry} />}
        {started.length > 0 && (
          <section className="courses-section" aria-labelledby="started-courses">
            <h2 id="started-courses">{t.startedCourses}</h2>
            <ul className="catalog-cards">
              {started.map((progress) => (
                <CatalogCard key={progress.course.slug} progress={progress} started />
              ))}
            </ul>
          </section>
        )}
        {others.length > 0 && (
          <section className="courses-section" aria-labelledby={started.length > 0 ? "other-courses" : undefined}>
            {started.length > 0 && <h2 id="other-courses">{t.otherCourses}</h2>}
            <ul className="catalog-cards">
              {others.map((progress) => (
                <CatalogCard key={progress.course.slug} progress={progress} />
              ))}
            </ul>
          </section>
        )}
      </section>
    </Page>
  );
}

function CatalogCard({ progress, started = false }: { progress: CourseProgress; started?: boolean }) {
  const { course, done, answered, total, finished } = progress;
  const to = `/course/${encodeURIComponent(course.slug)}`;
  const grades = t.grades(course.grades);
  const action = started && !finished ? t.continueCourse : t.openCourse;
  return (
    <li className={`catalog-card${started ? " is-started" : ""}${finished ? " is-finished" : ""}`} data-course={course.slug}>
      <span className="course-cover">{course.cover && <img src={course.cover} alt="" width={192} height={192} />}</span>
      <span className="catalog-card-body">
        <span className="catalog-card-title">
          {/* Its ::after stretches over the whole card, so the card is one big target. */}
          <Link className="course-title" to={to}>
            {course.title}
          </Link>
          {finished && (
            <Badge variant="secondary" className="course-finished">
              <span aria-hidden="true">✓</span> {t.courseFinished}
            </Badge>
          )}
        </span>
        {course.description && <span className="catalog-card-description">{course.description}</span>}
        <span className="catalog-card-meta">
          {grades && (
            <span className="catalog-card-item">
              <GraduationCap aria-hidden="true" />
              {grades}
            </span>
          )}
          <span className="catalog-card-item">
            <BookOpen aria-hidden="true" />
            {t.lessonsCount(course.lessons)}
          </span>
          <span className="catalog-card-item">
            <FileText aria-hidden="true" />
            {t.tasks(total)}
          </span>
        </span>
        {started && <Progress className="catalog-card-progress" value={answered} strong={done} max={total} label={t.progressLabel(course.title)} text={t.progressLine(answered, total, done)} />}
        <Button asChild variant={started && !finished ? "default" : "outline"} className={`catalog-card-action ${started && !finished ? "primary" : "secondary"}`}>
          <Link to={to} aria-label={`${action}: ${course.title}`}>
            {action}
          </Link>
        </Button>
      </span>
    </li>
  );
}
