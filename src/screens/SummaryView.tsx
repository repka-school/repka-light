import type { ReactNode } from "react";
import { OptionList } from "@/ui/components/OptionList";
import { PageHeading } from "@/ui/components/PageHeading";
import { RichBody } from "@/ui/components/RichBody";
import { Eyebrow } from "@/components/Chrome";
import { isQuestion, type Lesson } from "@/content/types";
import { cardState, countOf, marksOf, questionNumber, type State } from "@/lesson/session";
import { answersPhrase, correctPhrase, stateMark } from "@/lesson/words";
import { bodyLabels, t } from "@/strings";

/** A task's text as one plain line, for the review list. */
function snippet(html: string): string {
  return (new DOMParser().parseFromString(html.replace(/<br\s*\/?>|<\/p>/gi, " $&"), "text/html").body.textContent ?? "").replace(/\s+/g, " ").trim();
}

type Tally = { first: number; second: number; wrong: number; total: number };

/** The lesson's result as a ring: right on the first try, then on the second, then missed, each its own colour. */
function ScoreRing({ first, second, wrong, total }: Tally) {
  const r = 54;
  const length = 2 * Math.PI * r;
  let offset = 0;
  const arc = (n: number, className: string) => {
    const part = total ? (n / total) * length : 0;
    const circle = n > 0 && <circle className={className} cx="64" cy="64" r={r} strokeDasharray={`${part} ${length}`} strokeDashoffset={-offset} />;
    offset += part;
    return circle;
  };
  return (
    <span className="score-ring">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="score-ring-track" cx="64" cy="64" r={r} />
        {arc(first, "score-ring-first")}
        {arc(second, "score-ring-second")}
        {arc(wrong, "score-ring-wrong")}
      </svg>
      <span className="score-ring-value">
        <strong>{t.score(first, total)}</strong>
        <span>{t.scoreLabel}</span>
      </span>
    </span>
  );
}

const tags: Record<"first" | "second" | "wrong", string> = { first: t.right, second: t.secondShort, wrong: t.incorrectStatus };

/**
 * A finished lesson: how many questions were right on the first try, how
 * many more on the second, the experience this pass added (`xp`, with
 * `newLevel` when it reached one), and every question to open and read again.
 */
export function SummaryView({ lesson, state, xp, newLevel, actions }: { lesson: Lesson; state: State; xp: number; newLevel: number | null; actions: ReactNode }) {
  const first = countOf(lesson, state, "first");
  const second = countOf(lesson, state, "second");
  const wrong = countOf(lesson, state, "wrong");
  const total = lesson.cards.filter(isQuestion).length;
  const perfect = total > 0 && first === total;
  return (
    <section className="summary-shell">
      <div className="summary-heading">
        <Eyebrow>{lesson.title}</Eyebrow>
        <PageHeading>{perfect ? t.lessonPerfect : t.lessonDone}</PageHeading>
        <p className="lead">{perfect ? t.lessonPerfectText : t.lessonDoneText}</p>
      </div>
      <div className={`summary-result${perfect ? " is-perfect" : ""}`}>
        <ScoreRing first={first} second={second} wrong={wrong} total={total} />
        <div className="summary-side">
          <ul className="score-legend">
            <li className="is-first">
              <span className="score-dot" aria-hidden="true" />
              {t.legendFirst}
              <strong>{first}</strong>
            </li>
            <li className="is-second">
              <span className="score-dot" aria-hidden="true" />
              {t.legendSecond}
              <strong>{second}</strong>
            </li>
            <li className="is-wrong">
              <span className="score-dot" aria-hidden="true" />
              {t.legendWrong}
              <strong>{wrong}</strong>
            </li>
          </ul>
          {xp > 0 && (
            <p className="summary-xp" id="lesson-xp">
              <span className="xp-gain">{t.lessonXp(xp)}</span>
              {newLevel && <strong>{t.levelNew(newLevel)}</strong>}
            </p>
          )}
          <div className="summary-actions">{actions}</div>
        </div>
      </div>
      <section className="review">
        <h2>{t.review}</h2>
        <p className="muted">{t.reviewHint}</p>
        {lesson.cards.map((card, i) => {
          if (!isQuestion(card)) return null;
          const entry = state.entries[i];
          const cs = cardState(entry);
          const kind = cs === "first" || cs === "second" ? cs : "wrong";
          const marked = marksOf(card, entry);
          const ids = (set: number[]) => set.map(String);
          const number = questionNumber(lesson, i);
          return (
            <details className={`review-item is-${kind}`} key={card.id}>
              <summary>
                <span className="review-mark" aria-hidden="true">
                  {stateMark(cs)}
                </span>
                <span className="review-text">
                  <span className="review-number">{t.question(number)}</span>
                  <span className="review-snippet">{snippet(card.body)}</span>
                </span>
                <span className={`result-tag is-${kind}`}>{tags[kind]}</span>
              </summary>
              <div className="review-content">
                <RichBody html={card.body} {...bodyLabels} />
                <OptionList
                  choices={card.choices.map((c) => ({ value: String(c.id), label: c.label, html: c.html }))}
                  label={t.optionsLabel}
                  {...bodyLabels}
                  correct={ids(marked.correct)}
                  mine={ids(marked.mine)}
                  describe={(s) => [s.mine && t.choiceMine, s.correct && t.choiceRight, s.wrong && t.choiceWrong].filter(Boolean).join(", ")}
                  className="review-options"
                />
                <div className="answer-comparison">
                  <p>{answersPhrase(card, entry)}</p>
                  <p>{correctPhrase(card)}</p>
                </div>
                <div className="explanation">
                  <h3>{t.solution}</h3>
                  {card.explanation ? <RichBody html={card.explanation} {...bodyLabels} /> : <p className="muted">{t.noExplanation}</p>}
                </div>
              </div>
            </details>
          );
        })}
      </section>
    </section>
  );
}
