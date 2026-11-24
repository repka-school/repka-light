import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Announcer, announce } from "@/ui/components/Announcer";
import { Button } from "@/ui/components/ui/button";
import { Page, SiteFooter, SiteHeader } from "@/components/Chrome";
import { LoadError, Loading, NotFound } from "@/components/LoadState";
import { loadCourse, useLoaded } from "@/content/load";
import { drillOf, isQuestion, lessonsOf, questionsOf, type Course, type Lesson } from "@/content/types";
import { hasMistakes, lessonStep, open, outcomeOf, reduce, type Action } from "@/lesson/session";
import { spokenVerdict } from "@/lesson/words";
import { lessonPath } from "@/screens/CourseScreen";
import { QuestionView } from "@/screens/QuestionView";
import { SummaryView } from "@/screens/SummaryView";
import { DrillLesson } from "@/screens/DrillLesson";
import { getSaved, grantXp, saveResult, saveRun } from "@/store/store";
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
const verdictRegion = "lesson-verdict";

function LessonRun({ course, lesson }: { course: Course; lesson: Lesson }) {
  const runKey = `${course.slug}/${lesson.slug}`;
  const [reward, setReward] = useState(noReward);
  // Results saved before experience was counted earn theirs now.
  useEffect(() => {
    void grantXp(lessonsOf(course).flatMap(questionsOf));
  }, [course]);
  const readRun = () => {
    const saved = getSaved();
    return open(lesson, saved, saved.runs[runKey]);
  };
  const [state, setState] = useState(readRun);
  const current = useRef(state);
  const pending = useRef<Promise<unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const apply = async (action: Action) => {
    if (pending.current) return;
    const before = current.current;
    const next = reduce(lesson, before, action);
    if (next === before) return;
    if (action.type === "select") {
      current.current = next;
      setState(next);
      return;
    }

    const restart = action.type === "restart" || action.type === "retryMistakes";
    const change = lessonStep(lesson, runKey, before, next, restart);
    const card = lesson.cards[next.index];
    const question = action.type === "check" && isQuestion(card) ? card : null;
    const entry = next.entries[next.index];
    const outcome = question && outcomeOf(entry);
    const write = question && outcome && entry.final ? saveResult(question, outcome, entry.final.choices, change) : saveRun(change);
    pending.current = write;
    setSaving(true);
    try {
      const award = await write;
      if (pending.current !== write) return;
      const committed = readRun();
      current.current = committed;
      setState(committed);
      if (restart) setReward(noReward);
      const { gained = 0, level = null } = award ?? {};
      if (gained > 0) setReward((r) => ({ gains: { ...r.gains, [card.id]: gained }, level: level ?? r.level }));
      if (question && committed.phase === "solving" && committed.index === next.index) {
        announce([spokenVerdict(question, committed.entries[next.index]), gained > 0 && t.xpGain(gained), level && t.levelNew(level)].filter(Boolean).join(". "), verdictRegion);
      }
    } finally {
      if (pending.current === write) {
        pending.current = null;
        setSaving(false);
      }
    }
  };
  const summary = state.phase === "summary";
  useEffect(() => {
    if (!summary) return;
    window.scrollTo(0, 0);
    document.getElementById("screen-title")?.focus({ preventScroll: true });
  }, [summary]);
  useLayoutEffect(() => {
    document.getElementById("screen-title")?.focus({ preventScroll: true });
    return () => { pending.current = null; };
  }, []);

  const coursePath = `/course/${encodeURIComponent(course.slug)}`;
  if (summary) {
    const lessons = lessonsOf(course);
    const next = lessons[lessons.indexOf(lesson) + 1];
    return (
      <>
        <SiteHeader />
        <main id="app" aria-busy={saving}>
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
      <main id="app" aria-busy={saving}>
        <Announcer key={state.index} id={verdictRegion} />
        <QuestionView
          lesson={lesson}
          state={state}
          coursePath={coursePath}
          courseTitle={course.title}
          gained={reward.gains[lesson.cards[state.index].id] ?? 0}
          onGoTo={(index) => apply({ type: "goTo", index })}
          onSelect={(id) => apply({ type: "select", id })}
          onOpenOptions={() => apply({ type: "openOptions" })}
          onCheck={() => apply({ type: "check" })}
          onNext={() => apply({ type: "next" })}
        />
      </main>
    </div>
  );
}
