import { t } from "@/strings";

const RADIUS = 50;
const LENGTH = 2 * Math.PI * RADIUS;
/** Between two arcs, and how far a planned arc's outline is from its hollow middle, in the drawing's units. */
const GAP = 4.5;
const RIM = 1.75;

/**
 * A program as a ring: one arc for each topic, with the number of topics in
 * the middle. A planned topic, one without lessons, is a hollow arc: an
 * outline drawn as a wide stroke with a narrower one in the card's colour
 * over it.
 */
export function TopicRing({ topics, large = false }: { topics: number; large?: boolean }) {
  const arc = Math.max(LENGTH / Math.max(topics, 1) - GAP, 2 * RIM + 1);
  return (
    <span className={large ? "topic-ring is-large" : "topic-ring"}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="topic-ring-planned" cx="60" cy="60" r={RADIUS} strokeDasharray={`${arc} ${GAP}`} strokeDashoffset={-GAP / 2} />
        <circle className="topic-ring-hollow" cx="60" cy="60" r={RADIUS} strokeDasharray={`${arc - 2 * RIM} ${GAP + 2 * RIM}`} strokeDashoffset={-(GAP / 2 + RIM)} />
      </svg>
      <span className="topic-ring-text">
        <span className="topic-ring-count">{t.topicsCount(topics)}</span>
        <span className="topic-ring-note">{t.programPlanned}</span>
      </span>
    </span>
  );
}
