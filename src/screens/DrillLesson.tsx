import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { Page } from "@/components/Chrome";
import { TheoryCardView } from "@/components/TheoryCardView";
import type { Course, DrillCard, Lesson, TheoryCard } from "@/content/types";
import { lessonsOf } from "@/content/types";
import { DRILL_ROUNDS, DRILL_SECONDS, drillQuestions, type DrillQuestion } from "@/lesson/drill";
import { lessonPath } from "@/screens/CourseScreen";
import { saveDrillResult } from "@/store/store";
import { bodyLabels, t } from "@/strings";
import { PageHeading } from "@/ui/components/PageHeading";
import { RichBody } from "@/ui/components/RichBody";
import { Button } from "@/ui/components/ui/button";

type Run = {
  questions: DrillQuestion[];
  cardStartedAt: number;
  totalAnswerMs: number;
  index: number;
  deadline: number;
  selected: { value: number; late: boolean } | null;
  score: number;
};

const turnTime = DRILL_SECONDS * 1000;
const feedbackMs = 2000;

export function DrillLesson({ course, lesson, theory, drill }: { course: Course; lesson: Lesson; theory: TheoryCard; drill: DrillCard }) {
  const [showGame, setShowGame] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [seconds, setSeconds] = useState(DRILL_SECONDS);
  const [timing, setTiming] = useState<{ tenths: number; previousBest?: number } | null>(null);
  const savedRun = useRef<Run | null>(null);
  const index = run?.index;
  const deadline = run?.deadline;
  const selected = run?.selected;
  const question = run?.questions[run.index];
  const answerText = (value: number) => drill.answerLabels?.[value] ?? String(value);
  let feedback = seconds === 0 ? t.drill.timeUp : "";
  if (question && selected) {
    feedback = selected.value === question.answer ? t.drill.correct : t.drill.wrong(answerText(question.answer));
    if (selected.late) feedback += ` ${t.drill.lateAnswer}`;
  }
  const finished = !!run && !question;
  const phase = showGame ? finished ? "result" : run ? "playing" : "ready" : "theory";
  const coursePath = `/course/${encodeURIComponent(course.slug)}`;
  const lessons = lessonsOf(course);
  const next = lessons[lessons.indexOf(lesson) + 1];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  useEffect(() => {
    if (!question || deadline === undefined) return;
    let timer: number;
    const tick = () => {
      const timeLeft = deadline - performance.now();
      if (timeLeft <= 0) {
        if (!selected) {
          setSeconds(0);
          return;
        }
        const cardStartedAt = performance.now();
        setRun((current) => current && current.index === index && current.deadline === deadline
          ? { ...current, index: current.index + 1, cardStartedAt, deadline: cardStartedAt + turnTime, selected: null }
          : current);
        setSeconds(DRILL_SECONDS);
        return;
      }
      const remaining = Math.ceil(timeLeft / 1000);
      setSeconds(selected?.late ? 0 : remaining);
      timer = window.setTimeout(tick, timeLeft - (remaining - 1) * 1000);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [question, index, deadline, selected]);

  useEffect(() => {
    if (!finished || savedRun.current === run) return;
    savedRun.current = run;
    const tenths = Math.round(run.totalAnswerMs / 100);
    const previousBest = saveDrillResult(drill.id, run.score, tenths);
    setTiming({ tenths, previousBest });
  }, [drill.id, finished, run]);

  const start = () => {
    const questions = drillQuestions(drill);
    const cardStartedAt = performance.now();
    setTiming(null);
    setSeconds(DRILL_SECONDS);
    setRun({ questions, cardStartedAt, totalAnswerMs: 0, index: 0, deadline: cardStartedAt + turnTime, selected: null, score: 0 });
  };

  const choose = (value: number) => {
    if (!question) return;
    const now = performance.now();
    setRun((current) => {
      if (!current || current.index !== index || current.deadline !== deadline || current.selected !== null) return current;
      const late = now >= current.deadline;
      const correct = value === question.answer;
      let advanceAt = current.deadline;
      if (late) advanceAt = now + feedbackMs;
      else if (correct) advanceAt = Math.min(current.deadline, now + feedbackMs);
      return {
        ...current,
        selected: { value, late },
        totalAnswerMs: current.totalAnswerMs + (now - current.cardStartedAt),
        score: current.score + (correct && !late ? 1 : 0),
        deadline: advanceAt,
      };
    });
  };

  const keyAnswer = (event: KeyboardEvent<HTMLElement>) => {
    if (!question || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (event.key !== "1" && event.key !== "2" && event.key !== "3") return;
    event.preventDefault();
    choose(question.options[Number(event.key) - 1]);
  };

  return (
    <Page focusKey={phase} className="drill-page">
      <section className="practice-shell">
        <div className="practice-top">
          <Link className="lesson-course" to={coursePath} id="to-course">{course.title}</Link>
        </div>
        {showGame && <p className="lesson-title-line">{lesson.title}</p>}
        <p className="progress-row progress-position">{t.cardPosition(showGame ? 2 : 1, lesson.cards.length)}</p>
        {!showGame ? (
          <>
            <TheoryCardView card={theory} />
            <div className="drill-actions drill-theory-action">
              <Button type="button" className="primary" onClick={() => setShowGame(true)}>{t.drill.next}</Button>
            </div>
          </>
        ) : (
          <article className="question-card drill-card" onKeyDown={keyAnswer}>
            <PageHeading>{finished ? t.drill.result : t.drill.title}</PageHeading>
            {!run && (
              <>
                <p>{t.drill.instructions(DRILL_ROUNDS, DRILL_SECONDS)}</p>
                <p className="muted">{t.drill.controls}</p>
                <div className="drill-actions">
                  <Button type="button" className="primary" onClick={start}>{t.drill.start}</Button>
                  <Button type="button" variant="outline" className="secondary" onClick={() => setShowGame(false)}>{t.theory}</Button>
                </div>
              </>
            )}
            {run && question && (
              <>
                <div className="drill-round">
                  <span>{t.score(run.index + 1, run.questions.length)}</span>
                  <span role="timer" aria-label={t.drill.remaining}>{t.drill.time(seconds)}</span>
                </div>
                <div className="drill-clock" aria-hidden="true">
                  <span style={{ width: `${seconds / DRILL_SECONDS * 100}%` }} />
                </div>
                <p className="drill-prompt" aria-live="polite" aria-atomic="true">
                  {question.promptHtml ? <RichBody as="span" html={question.promptHtml} {...bodyLabels} /> : question.prompt}
                  {!drill.equation && " = ?"}
                </p>
                <div className="drill-options" role="group" aria-label={t.optionsLabel}>
                  {question.options.map((value, i) => (
                    <Button
                      type="button"
                      key={i}
                      variant="outline"
                      className="drill-option"
                      aria-keyshortcuts={String(i + 1)}
                      aria-disabled={run.selected !== null}
                      data-mark={run.selected === null ? undefined : value === question.answer ? "correct" : value === run.selected.value ? "wrong" : undefined}
                      onClick={() => choose(value)}
                    >
                      <kbd aria-hidden="true">{i + 1}</kbd><span>{answerText(value)}</span>
                    </Button>
                  ))}
                </div>
                <p className="drill-verdict" role="status">
                  {feedback}
                </p>
              </>
            )}
            {finished && (
              <>
                <p className="drill-score">{t.drill.score(run.score, run.questions.length)}</p>
                {timing && <p>{t.drill.totalTime(timing.tenths)}<br />{t.drill.timeRecord(timing.tenths, timing.previousBest)}</p>}
                <p className="xp-gain">{t.drill.xp(run.score)}</p>
                <div className="drill-actions">
                  <Button type="button" className="primary" onClick={start}>{t.drill.replay}</Button>
                  <Button asChild variant="outline" className="secondary">
                    <Link to={next ? lessonPath(course.slug, next.slug) : coursePath}>{next ? t.nextLesson : t.backToCourse}</Link>
                  </Button>
                </div>
              </>
            )}
          </article>
        )}
      </section>
    </Page>
  );
}
