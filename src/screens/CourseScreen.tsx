import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { BookOpen, FileText, GraduationCap } from "lucide-react";
import { PageHeading } from "@/ui/components/PageHeading";
import { Progress } from "@/ui/components/ui/progress";
import { Button } from "@/ui/components/ui/button";
import { TheoryPicture } from "@/ui/pictures/TheoryPicture";
import { Eyebrow, Page } from "@/components/Chrome";
import { LoadError, Loading, NotFound } from "@/components/LoadState";
import { loadCourse, useLoaded } from "@/content/load";
import { drillOf, lessonsOf, questionsOf, type Course, type CourseSource, type Lesson } from "@/content/types";
import { courseProgress } from "@/content/progress";
import { DRILL_ROUNDS } from "@/lesson/drill";
import { hasAnswers, lessonState, type LessonState } from "@/lesson/session";
import { solvedCount, type Saved } from "@/store/storage";
import { grantXp, useSaved } from "@/store/store";
import { t } from "@/strings";

/** Where a lesson stands, counting a pass with answers but no settled task yet as started. */
function standing(course: string, lesson: Lesson, saved: Saved): LessonState {
  const drill = drillOf(lesson);
  if (drill) {
    const score = saved.drills?.[drill.id];
    if (score === undefined) return "new";
    return score === DRILL_ROUNDS ? "finished" : "partial";
  }
  const state = lessonState(lesson, saved.results);
  return state === "new" && hasAnswers(saved.runs[`${course}/${lesson.slug}`]) ? "partial" : state;
}

const startWords: Record<LessonState, string> = { new: t.startLesson, partial: t.continueLesson, finished: t.repeatLesson };

export const lessonPath = (course: string, lesson: string) => `/course/${encodeURIComponent(course)}/lesson/${encodeURIComponent(lesson)}`;

/** A course's page: a cover with the course's progress, then its lessons as a numbered path under their modules. */
export function CourseScreen() {
  const { slug = "" } = useParams();
  const course = useLoaded(`course:${slug}`, () => loadCourse(slug));
  // The heading comes with the course: the key changes when it has loaded, so focus moves to it then.
  return (
    <Page focusKey={`course:${slug}:${course.loading ? "loading" : "shown"}`} busy={course.loading}>
      {course.loading && <Loading />}
      {course.error && (/404/.test(course.error.message) ? <NotFound /> : <LoadError onRetry={course.retry} />)}
      {course.data && <CourseOutline course={course.data} />}
    </Page>
  );
}

function CourseOutline({ course }: { course: Course }) {
  const saved = useSaved();
  const lessons = lessonsOf(course);
  // Results saved before experience was counted earn theirs now.
  useEffect(() => grantXp(lessonsOf(course).flatMap(questionsOf)), [course]);
  // The first lesson not finished carries the filled button.
  const primary = lessons.find((l) => standing(course.slug, l, saved) !== "finished");
  const questionIds = lessons.flatMap((l) => questionsOf(l).map((q) => q.id));
  const drillIds = lessons.flatMap((l) => l.cards.filter((c) => c.kind === "drill").map((c) => c.id));
  const drillCourse = !questionIds.length && drillIds.length > 0;
  const coverPicture = course.coverPicture ?? (drillCourse ? "table" : null);
  const { done, answered, total } = courseProgress({ slug: course.slug, questions: questionIds, drills: drillIds }, saved);
  const progress = drillCourse ? t.drill.progress(answered, total, done) : t.progressLine(answered, total, done);
  const grades = t.grades(course.grades);
  // Lessons are numbered through the whole course, across modules.
  let number = 0;
  return (
    <section className="course-shell">
      <div className="course-hero">
        <div className="course-heading">
          <Eyebrow>{t.courseEyebrow}</Eyebrow>
          <PageHeading>{course.title}</PageHeading>
          {course.description && <p className="course-description">{course.description}</p>}
          <span className="catalog-card-meta">
            {grades && (
              <span className="catalog-card-item">
                <GraduationCap aria-hidden="true" />
                {grades}
              </span>
            )}
            <span className="catalog-card-item">
              <BookOpen aria-hidden="true" />
              {t.lessonsCount(lessons.length)}
            </span>
            {!!questionIds.length && (
              <span className="catalog-card-item">
                <FileText aria-hidden="true" />
                {t.tasks(questionIds.length)}
              </span>
            )}
          </span>
        </div>
        {(course.cover || coverPicture) && (
          <span className="course-hero-art">
            {course.cover ? <img src={course.cover} alt="" width={192} height={192} /> : coverPicture && <TheoryPicture name={coverPicture} size={144} />}
          </span>
        )}
      </div>
      <div className={`course-next${answered > 0 ? " is-started" : ""}`}>
        {answered > 0 && <ProgressRing value={answered} strong={done} max={total} label={t.progressLabel(course.title)} text={progress} />}
        <span className="course-next-text">
          <span className="course-next-title">{answered === 0 ? t.courseNextNew : primary ? t.courseNextStarted : t.courseNextDone}</span>
          {answered > 0 && <span className="course-next-line">{progress}</span>}
        </span>
        {primary && (
          <Button asChild className="primary" id="course-primary-start">
            <Link to={lessonPath(course.slug, primary.slug)}>
              {startWords[standing(course.slug, primary, saved)]}: {primary.title}
              <span aria-hidden="true">→</span>
            </Link>
          </Button>
        )}
      </div>
      {course.modules.map((module) => (
        <section className="module" key={module.slug}>
          {module.title && <h2 className="module-heading">{module.title}</h2>}
          <ol className="lesson-list">
            {module.lessons.map((lesson) => (
              <LessonRow key={lesson.slug} number={++number} course={course.slug} lesson={lesson} saved={saved} primary={lesson.slug === primary?.slug} />
            ))}
          </ol>
        </section>
      ))}
      {course.source && <SourceCitation source={course.source} />}
    </section>
  );
}

function SourceCitation({ source: { book, sections } }: { source: CourseSource }) {
  return (
    <section className="course-source" aria-labelledby="course-source-title">
      <h2 className="module-heading" id="course-source-title">{t.courseSource}</h2>
      <p>
        {book.author}. <a href={book.url} lang={book.language}><cite>{book.title}</cite></a>. {t.courseEdition(book.edition, book.year)}.
      </p>
      <ul>
        {sections.map((section) => (
          <li key={section.url}><a href={section.url} lang={book.language}>{section.title}</a></li>
        ))}
      </ul>
      <p>
        {book.copyright}. {t.courseAdaptation} <a href={book.license.url} rel="license">{book.license.title}</a>.
      </p>
    </section>
  );
}

/** The course's progress as a ring: answered tasks lighter, the ones solved on the first try darker, the first-try share in the middle. */
function ProgressRing({ value, strong, max, label, text }: { value: number; strong: number; max: number; label: string; text: string }) {
  const r = 26;
  const length = 2 * Math.PI * r;
  const share = (n: number) => (max > 0 ? Math.min(n, max) / max : 0);
  return (
    <span className="progress-ring" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={text}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="progress-ring-track" cx="32" cy="32" r={r} />
        <circle className="progress-ring-answered" cx="32" cy="32" r={r} strokeDasharray={`${share(value) * length} ${length}`} />
        <circle className="progress-ring-strong" cx="32" cy="32" r={r} strokeDasharray={`${share(strong) * length} ${length}`} />
      </svg>
      <span className="progress-ring-value" aria-hidden="true">
        {Math.round(100 * share(value))}%
      </span>
    </span>
  );
}

function LessonRow({ number, course, lesson, saved, primary }: { number: number; course: string; lesson: Lesson; saved: Saved; primary: boolean }) {
  const questions = questionsOf(lesson);
  const drill = drillOf(lesson);
  const best = drill && saved.drills?.[drill.id];
  const theory = lesson.cards.length - questions.length;
  const state = standing(course, lesson, saved);
  const done = solvedCount(
    saved.results,
    questions.map((q) => q.id),
  );
  const answered = questions.filter((q) => saved.results[q.id]).length;
  return (
    <li className={`lesson-item is-${state}${primary ? " is-next" : ""}`} data-lesson={lesson.slug}>
      <span className="lesson-step" aria-hidden="true">
        {state === "finished" ? "✓" : number}
      </span>
      <div className="lesson-row">
        <span className="lesson-text">
          <span className="lesson-title">
            {lesson.title}
            {state === "finished" && <span className="sr-only"> · {t.lessonFinished}</span>}
          </span>
          <span className="lesson-meta">{drill ? t.drill.lessonMeta : t.lessonCounts(theory, questions.length)}</span>
          {drill ? best !== undefined && <Progress className="lesson-progress" value={best} max={DRILL_ROUNDS} label={lesson.title} text={t.drill.best(best, DRILL_ROUNDS)} /> : (
            <Progress className="lesson-progress" value={answered} strong={done} max={questions.length} label={lesson.title} text={t.lessonProgress(answered, questions.length)} />
          )}
        </span>
        {/* Its ::after stretches over the whole row, so the row is one big target. */}
        <Button asChild variant={primary ? "default" : "outline"} className={primary ? "primary lesson-start" : "secondary lesson-start"}>
          <Link to={lessonPath(course, lesson.slug)} aria-label={`${startWords[state]}: ${lesson.title}`}>
            {startWords[state]}
          </Link>
        </Button>
      </div>
    </li>
  );
}
