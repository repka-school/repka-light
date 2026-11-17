import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { announce } from "@/ui/components/Announcer";
import { Button } from "@/ui/components/ui/button";
import { Page, SiteFooter, SiteHeader } from "@/components/Chrome";
import { LoadError, Loading, NotFound } from "@/components/LoadState";
import { loadCourse, useLoaded } from "@/content/load";
import { isQuestion, lessonsOf, type Course, type Lesson } from "@/content/types";
import { hasMistakes, open, outcomeOf, reduce, snapshot, type Action } from "@/lesson/session";
import { spokenVerdict } from "@/lesson/words";
import { lessonPath } from "@/screens/CourseScreen";
import { QuestionView } from "@/screens/QuestionView";
import { SummaryView } from "@/screens/SummaryView";
import { getSaved, saveResult, saveRun } from "@/store/store";
import { t } from "@/strings";

/** A lesson of a course: its cards one at a time, then the summary. */
export function LessonScreen() {
  const { slug = "", lesson: lessonSlug = "" } = useParams();
  const course = useLoaded(`course:${slug}`, () => loadCourse(slug));
  const lesson = course.data && lessonsOf(course.data).find((l) => l.slug === lessonSlug);
  if (course.data && lesson) return <LessonRun key={`${slug}/${lessonSlug}`} course={course.data} lesson={lesson} />;
  return (
    <Page focusKey={`lesson:${slug}/${lessonSlug}`} busy={course.loading}>
      {course.loading && <Loading />}
      {course.error && !/404/.test(course.error.message) && <LoadError onRetry={course.retry} />}
      {(course.data || (course.error && /404/.test(course.error.message))) && <NotFound />}
    </Page>
  );
}

function LessonRun({ course, lesson }: { course: Course; lesson: Lesson }) {
  const runKey = `${course.slug}/${lesson.slug}`;
  const [state, setState] = useState(() => {
    const saved = getSaved();
    return open(lesson, saved, saved.runs[runKey]);
  });
  // Every step is saved as it happens, so a reload loses nothing.
  const apply = (action: Action) => {
    const next = reduce(lesson, state, action);
    if (next !== state) {
      setState(next);
      saveRun(runKey, snapshot(lesson, next));
    }
    return next;
  };
  // Checking an answer says the verdict aloud and, once the task is settled, saves its result.
  const check = () => {
    const card = lesson.cards[state.index];
    const entry = apply({ type: "check" }).entries[state.index];
    if (!isQuestion(card) || entry === state.entries[state.index]) return;
    announce(spokenVerdict(card, entry));
    const outcome = outcomeOf(entry);
    if (outcome && entry.final) saveResult(card.id, outcome, entry.final.choices);
  };
  const summary = state.phase === "summary";
  useEffect(() => {
    if (!summary) return;
    window.scrollTo(0, 0);
    document.getElementById("screen-title")?.focus({ preventScroll: true });
  }, [summary]);
  useEffect(() => {
    document.getElementById("screen-title")?.focus({ preventScroll: true });
  }, []);

  const coursePath = `/course/${encodeURIComponent(course.slug)}`;
  if (summary) {
    const lessons = lessonsOf(course);
    const next = lessons[lessons.indexOf(lesson) + 1];
    return (
      <>
        <SiteHeader />
        <main id="app">
          <SummaryView
            lesson={lesson}
            state={state}
            actions={
              <>
                {next ? (
                  <Button asChild className="primary" id="next-lesson">
                    <Link to={lessonPath(course.slug, next.slug)}>
                      {t.nextLesson}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="primary" id="to-course">
                    <Link to={coursePath}>{t.backToCourse}</Link>
                  </Button>
                )}
                {hasMistakes(lesson, state) && (
                  <Button type="button" variant="outline" className="secondary" id="retry-mistakes" onClick={() => apply({ type: "retryMistakes" })}>
                    {t.retryMistakes}
                  </Button>
                )}
                <Button type="button" variant="outline" className="secondary" id="again" onClick={() => apply({ type: "restart" })}>
                  {t.againLesson}
                </Button>
                {next && (
                  <Button asChild variant="outline" className="secondary">
                    <Link to={coursePath}>{t.backToCourse}</Link>
                  </Button>
                )}
              </>
            }
          />
        </main>
        <SiteFooter />
      </>
    );
  }
  return (
    <div className="solving-page">
      <SiteHeader />
      <main id="app">
        <QuestionView
          lesson={lesson}
          state={state}
          coursePath={coursePath}
          courseTitle={course.title}
          onGoTo={(index) => apply({ type: "goTo", index })}
          onSelect={(id) => apply({ type: "select", id })}
          onOpenOptions={() => apply({ type: "openOptions" })}
          onCheck={check}
          onNext={() => apply({ type: "next" })}
        />
      </main>
    </div>
  );
}
