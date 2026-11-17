import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pause, Play } from "lucide-react";
import { StaticChoices } from "@/ui/components/ChoiceGroup";
import { Button } from "@/ui/components/ui/button";
import { sampleChoiceName, samples, t } from "@/strings";

/** How long a card shows before the next one slides in. */
const SAMPLE_MS = 5000;

const REDUCED = "(prefers-reduced-motion: reduce)";

/** Whether the system asks for reduced motion; follows a change of the setting. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED);
    const changed = () => setReduced(query.matches);
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  return reduced;
}

/**
 * The index page's sample tasks: answered task cards on a horizontal
 * scroll-snap track, so a swipe is the browser's own scroll. Every few
 * seconds the next card slides in, and after the last one the first, unless
 * the pointer or focus is on the figure, the pause button is set, or the
 * system asks for reduced motion; then nothing moves by itself and there is
 * no pause button. The dots follow whatever moved the track.
 */
export function SampleCards() {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const count = samples.length;
  const running = !reduced && !paused && !hovered && !focused;

  const go = useCallback(
    (index: number) => {
      const next = (index + count) % count;
      setCurrent(next);
      const el = track.current;
      el?.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [count, reduced],
  );

  // The dots show the card in view, whether the timer, a swipe, a key or a dot moved it.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const follow = () => {
      if (el.clientWidth > 0) setCurrent(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
    };
    el.addEventListener("scroll", follow, { passive: true });
    return () => el.removeEventListener("scroll", follow);
  }, [count]);

  // Any change of card starts the wait again.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => go(current + 1), SAMPLE_MS);
    return () => window.clearTimeout(timer);
  }, [running, current, go]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    go(current + (event.key === "ArrowRight" ? 1 : -1));
  };
  // Starting the cards again takes effect at once, though the pointer and focus are still on the button.
  const toggle = () => {
    if (paused) {
      setHovered(false);
      setFocused(false);
    }
    setPaused(!paused);
  };
  const pauseLabel = paused ? t.samplesPlay : t.samplesPause;

  return (
    <figure
      className="samples"
      aria-roledescription={t.samplesRole}
      data-running={running ? "true" : "false"}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <figcaption className="samples-caption">{t.samplesCaption}</figcaption>
      <div className="sample-track" ref={track} tabIndex={0} role="region" aria-label={t.samplesTrack} onKeyDown={onKeyDown}>
        {samples.map((sample) => (
          <div className="sample-card question-card" role="group" aria-roledescription={t.sampleRole} aria-label={sample.theme} key={sample.theme}>
            <p className="sample-theme">{sample.theme}</p>
            <div className="question-heading">
              {/* Not a heading: the page's outline is the index page's own. */}
              <span className="sample-heading">{t.question(sample.number)}</span>
              <span className="card-tags">
                <span className="year-tag">{t.points(sample.points)}</span>
              </span>
            </div>
            <p className="sample-statement">{sample.statement}</p>
            <StaticChoices
              legend={t.optionsLabel}
              choices={t.sampleLetters.map((letter, i) => ({ value: letter, label: letter, text: <span>{sample.options[i]}</span>, name: sampleChoiceName(letter, sample.options[i], letter === sample.right) }))}
              correct={[sample.right]}
              describe={(choice) => choice.name ?? choice.value}
            />
            <p className="feedback positive sample-verdict">
              <span aria-hidden="true">✓</span> {sample.verdict}
            </p>
          </div>
        ))}
      </div>
      <div className="sample-controls">
        {!reduced && (
          <Button type="button" variant="ghost" size="icon" className="sample-pause" aria-label={pauseLabel} title={pauseLabel} aria-pressed={paused} onClick={toggle}>
            {paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}
          </Button>
        )}
        <div className="sample-dots" role="group" aria-label={t.samplesDots}>
          {samples.map((sample, i) => (
            <button type="button" key={sample.theme} className="sample-dot" aria-label={sample.dot} aria-current={i === current ? "true" : undefined} onClick={() => go(i)}>
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </figure>
  );
}
