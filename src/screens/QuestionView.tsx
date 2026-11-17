import { Link } from "react-router";
import { ChoiceGroup } from "@/ui/components/ChoiceGroup";
import { OptionText } from "@/ui/components/OptionText";
import { PageHeading } from "@/ui/components/PageHeading";
import { RichBody } from "@/ui/components/RichBody";
import { Button } from "@/ui/components/ui/button";
import { Dialog, DialogTrigger } from "@/ui/components/ui/dialog";
import { Progress } from "@/ui/components/ui/progress";
import { SiteFooter } from "@/components/Chrome";
import { QuestionNavigator } from "@/components/QuestionNavigator";
import type { Lesson, QuestionCard } from "@/content/types";
import { cardState, checkable, doneCount, marksOf, primaryAction, questionNumber, sameAsFirst, type Entry, type State } from "@/lesson/session";
import { useLessonLayout } from "@/lesson/useLessonLayout";
import { actionWords, answersPhrase, correctPhrase, verdictWords } from "@/lesson/words";
import { bodyLabels, t } from "@/strings";

type Props = {
  lesson: Lesson;
  state: State;
  /** Where «К курсу» leads. */
  coursePath: string;
  /** The course's name: the link back to the course. */
  courseTitle: string;
  onGoTo: (index: number) => void;
  onSelect: (id: number) => void;
  onOpenOptions: () => void;
  onCheck: () => void;
  onNext: () => void;
};

const SAME_SET_ID = "same-set";

/** One card of a running lesson, with the lesson's progress, its numbers and the one primary action. */
export function QuestionView({ lesson, state, coursePath, courseTitle, onGoTo, onSelect, onOpenOptions, onCheck, onNext }: Props) {
  const card = lesson.cards[state.index];
  const entry = state.entries[state.index];
  const layout = useLessonLayout(state.index, `${state.index}:${cardState(entry)}`);
  const action = primaryAction(lesson, state);
  const checks = action === "check" || action === "checkAgain";
  const done = doneCount(lesson, state);
  const chooseNumber = (index: number) => {
    layout.setNumbersOpen(false);
    onGoTo(index);
  };
  return (
    <Dialog open={layout.numbersOpen} onOpenChange={layout.setNumbersOpen}>
      <section className="practice-shell solving-shell">
        <div className="question-top">
          <div className="practice-top">
            <Link className="lesson-course" to={coursePath} id="to-course">
              {courseTitle}
            </Link>
            {!layout.wide && (
              <DialogTrigger asChild>
                <Button type="button" variant="link" className="text-button question-jump" id="question-jump">
                  {t.questionJump}
                </Button>
              </DialogTrigger>
            )}
          </div>
          <p className="lesson-title-line">{lesson.title}</p>
          <div className="progress-row">
            <span className="progress-position">{t.cardPosition(state.index + 1, lesson.cards.length)}</span>
            <Progress className="question-progress" value={done} max={lesson.cards.length} label={t.cardsDone(done, lesson.cards.length)} text={t.cardsDoneShort(done)} />
          </div>
        </div>
        <div className="practice-main">
          <div className="solving-scroll" ref={layout.content}>
            {card.kind === "theory" ? (
              <article className="question-card theory-card">
                <div className="question-heading">
                  <PageHeading>{t.theory}</PageHeading>
                </div>
                {card.title && <h2 className="theory-title">{card.title}</h2>}
                <RichBody html={card.body} className="question-body" {...bodyLabels} />
              </article>
            ) : (
              <article className="question-card">
                <div className="question-heading">
                  <PageHeading>{t.question(questionNumber(lesson, state.index))}</PageHeading>
                  {card.points !== null && (
                    <span className="card-tags">
                      <span className="year-tag">{t.points(card.points)}</span>
                    </span>
                  )}
                </div>
                <RichBody html={card.body} className="question-body" {...bodyLabels} />
                <Answer card={card} entry={entry} state={state} onSelect={onSelect} onOpenOptions={onOpenOptions} />
              </article>
            )}
            <div ref={layout.action} className="solving-action" data-stuck={layout.stuck || undefined}>
              <Button type="button" className="primary" id="primary-action" disabled={checks && !checkable(state)} onClick={checks ? onCheck : onNext}>
                {actionWords(action)}
                <span aria-hidden="true">→</span>
              </Button>
            </div>
            <div className="solving-rest" ref={layout.rest} aria-hidden="true" />
            <SiteFooter />
          </div>
        </div>
        <QuestionNavigator lesson={lesson} state={state} wide={layout.wide} onGoTo={chooseNumber} />
      </section>
    </Dialog>
  );
}

/** A question's options and, once checked, its verdict, hint and worked solution. */
function Answer({ card, entry, state, onSelect, onOpenOptions }: { card: QuestionCard; entry: Entry; state: State; onSelect: (id: number) => void; onOpenOptions: () => void }) {
  const multi = card.answerKind === "multi";
  const cs = cardState(entry);
  const judged = cs !== "unanswered";
  const right = cs === "first" || cs === "second";
  // A tile is keyed by its letter, which the card shows; answers are kept by option id.
  const labels = (ids: number[]) => card.choices.filter((c) => ids.includes(c.id)).map((c) => c.label);
  const marked = marksOf(card, entry);
  // A `multi` set between its tries is open to change: no tile is marked yet.
  const open = multi && !entry.final;
  // A settled answer always shows its options, as does a hidden set once asked for.
  const optionsShown = !card.hideOptions || entry.opened || judged;
  return (
    <>
      {!optionsShown ? (
        <Button type="button" variant="outline" className="secondary reveal-options" onClick={onOpenOptions}>
          {t.revealOptions}
        </Button>
      ) : (
        <ChoiceGroup
          name="answer"
          kind={card.answerKind}
          legend={multi ? t.chooseAll : t.choose}
          choices={card.choices.map((c) => ({ value: c.label, label: c.label, text: <OptionText html={c.html} {...bodyLabels} />, name: `${c.label}: ${c.text}` }))}
          selected={labels(state.selected)}
          onSelect={(label) => {
            const choice = card.choices.find((c) => c.label === label);
            if (choice) onSelect(choice.id);
          }}
          disabled={!!entry.final}
          correct={labels(marked.correct)}
          wrong={labels(marked.wrong)}
          mine={open ? [] : labels(marked.mine)}
          marks={!open}
          locked={!multi && !entry.final && entry.first ? labels(entry.first) : []}
          note={sameAsFirst(card, state) ? { id: SAME_SET_ID, text: t.sameSet } : undefined}
          describe={(c, s) => [c.name, s.mine && t.choiceMine, s.correct && t.choiceRight, s.wrong && t.choiceWrong].filter(Boolean).join(", ")}
        />
      )}
      {judged && (
        <section className={`feedback ${right ? "positive" : "negative"}`} id="task-feedback">
          <h2>
            <span aria-hidden="true">{right ? "✓" : "✗"}</span> {verdictWords(entry)}
          </h2>
          <p>
            {answersPhrase(card, entry)}
            {entry.final && ` · ${correctPhrase(card)}`}
          </p>
          {cs === "waiting" && <p>{t.tryAgain}</p>}
        </section>
      )}
      {cs === "waiting" && card.hint && (
        <div className="explanation hint">
          <h3>{t.hint}</h3>
          <RichBody html={card.hint} {...bodyLabels} />
        </div>
      )}
      {entry.final && (
        <div className="explanation">
          <h3>{t.solution}</h3>
          {card.explanation ? <RichBody html={card.explanation} {...bodyLabels} /> : <p className="muted">{t.noExplanation}</p>}
        </div>
      )}
    </>
  );
}
