import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { announce } from "@/ui/components/Announcer";
import { Button } from "@/ui/components/ui/button";
import { Page, SiteFooter, SiteHeader } from "@/components/Chrome";
import { LoadError, Loading, NotFound } from "@/components/LoadState";
import { loadCourse, useLoaded } from "@/content/load";
import { drillOf, isQuestion, lessonsOf, questionsOf, type Course, type Lesson } from "@/content/types";
import { hasMistakes, open, outcomeOf, reduce, snapshot, type Action } from "@/lesson/session";
import { spokenVerdict } from "@/lesson/words";
import { lessonPath } from "@/screens/CourseScreen";
import { QuestionView } from "@/screens/QuestionView";
import { SummaryView } from "@/screens/SummaryView";
import { DrillLesson } from "@/screens/DrillLesson";
import { getSaved, grantXp, saveResult, saveRun } from "@/store/store";
import { standingOf, totalXp } from "@/store/xp";
import { t } from "@/strings";

/** A lesson of a course: its cards one at a time, then the summary. */
export function LessonScreen() {
  const { slug = "", lesson: lessonSlug = "" } = useParams();
  const course = useLoaded(`course:${slug}`, () => loadCourse(slug));
  const lesson = course.data && lessonsOf(course.data).find((l) => l.slug === lessonSlug);
  if (course.data && lesson) {
    const key = `${slug}/${lessonSlug}`;
    const drill = drillOf(lesson);
    const theory = lesson.cards.find((card) => card.kind === "theory");
    if (drill && theory) return <DrillLesson key={key} course={course.data} lesson={lesson} theory={theory} drill={drill} />;
    return <LessonRun key={key} course={course.data} lesson={lesson} />;
  }
  return (
    <Page focusKey={`lesson:${slug}/${lessonSlug}:${course.loading ? "loading" : "shown"}`} busy={course.loading}>
      {course.loading && <Loading />}
      {course.error && !/404/.test(course.error.message) && <LoadError onRetry={course.retry} />}
      {(course.data || (course.error && /404/.test(course.error.message))) && <NotFound />}
    </Page>
  );
}

/** What this visit's answers have added: experience by task, and the level the last level-up reached. */
type Reward = { gains: Record<string, number>; level: number | null };
const noReward: Reward = { gains: {}, level: null };
const levelNow = () => standingOf(totalXp(getSaved().xp)).level;

function LessonRun({ course, lesson }: { course: Course; lesson: Lesson }) {
  const runKey = `${course.slug}/${lesson.slug}`;
  const [reward, setReward] = useState(noReward);
  // Results saved before experience was counted earn theirs now.
  useEffect(() => grantXp(lessonsOf(course).flatMap(questionsOf)), [course]);
  const [state, setState] = useState(() => {
    const saved = getSaved();
    return open(lesson, saved, saved.runs[runKey]);
  });
  // Every step is saved as it happens, so a reload loses nothing.
  const apply = (action: Action) => {
    const next = reduce(lesson, state, action);
    // A new pass counts its own experience.
    if (action.type === "restart" || action.type === "retryMistakes") setReward(noReward);
    if (next !== state) {
      setState(next);
      saveRun(runKey, snapshot(lesson, next));
    }
    return next;
  };
  // Checking an answer says the verdict aloud and, once the task is settled, saves its result and gives its experience.
  const check = () => {
    const card = lesson.cards[state.index];
    const entry = apply({ type: "check" }).entries[state.index];
    if (!isQuestion(card) || entry === state.entries[state.index]) return;
    const outcome = outcomeOf(entry);
    const before = levelNow();
    const gained = outcome && entry.final ? saveResult(card, outcome, entry.final.choices) : 0;
    const level = levelNow() > before ? levelNow() : null;
    if (gained > 0) setReward((r) => ({ gains: { ...r.gains, [card.id]: gained }, level: level ?? r.level }));
    announce([spokenVerdict(card, entry), gained > 0 && t.xpGain(gained), level && t.levelNew(level)].filter(Boolean).join(". "));
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
            xp={Object.values(reward.gains).reduce((sum, n) => sum + n, 0)}
            newLevel={reward.level}
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
          gained={reward.gains[lesson.cards[state.index].id] ?? 0}
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
