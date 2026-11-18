import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/ui/popover";
import { Progress } from "@/ui/components/ui/progress";
import { freeXpOf, useSaved } from "@/store/store";
import { standingOf, totalXp, type Standing } from "@/store/xp";
import { t } from "@/strings";

/** Experience that arrived while the badge was on screen, to play once: how much, the ring's fill before it, and the new level if it brought one. */
type Burst = { key: number; gain: number; from: number; level: number | null };

// How long a burst stays: the bubble's hold and fade in app.css fit inside.
const GAIN_MS = 1800;
const LEVEL_UP_MS = 3400;

const percentOf = (standing: Standing) => (standing.earned / standing.needed) * 100;

/**
 * The header's level: the number in a ring that fills toward the next level.
 * It opens the experience behind it, how much of it is free to spend in the
 * homestead, and how experience is earned. New
 * experience fills the ring and floats its amount under the badge; a new
 * level refills the ring from empty and names the level.
 */
export function LevelBadge() {
  const saved = useSaved();
  const { xp } = saved;
  const [open, setOpen] = useState(false);
  const standing = useMemo(() => standingOf(totalXp(xp)), [xp]);
  const [seen, setSeen] = useState(standing);
  const [burst, setBurst] = useState<Burst | null>(null);
  if (standing !== seen) {
    setSeen(standing);
    if (standing.total > seen.total) {
      const levelUp = standing.level > seen.level;
      setBurst({ key: (burst?.key ?? 0) + 1, gain: standing.total - seen.total, from: levelUp ? 0 : percentOf(seen), level: levelUp ? standing.level : null });
    }
  }
  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(null), burst.level ? LEVEL_UP_MS : GAIN_MS);
    return () => window.clearTimeout(timer);
  }, [burst]);
  const motion = burst ? (burst.level ? " is-level-up" : " is-gain") : "";
  return (
    <span className="level-spot">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="level-badge" id="nav-level" aria-label={t.levelLabel(standing.level)}>
            {/* Keyed by the burst, so each one plays from its start. */}
            <span key={`ring-${burst?.key ?? 0}`} className={`level-ring${motion}`} aria-hidden="true" style={{ "--level-percent": percentOf(standing), "--level-from": burst?.from ?? 0 } as CSSProperties} />
            <span key={`number-${standing.level}`} className={`level-number${burst?.level ? " is-level-up" : ""}`} aria-hidden="true">
              {standing.level}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="level-details" aria-labelledby="level-title">
          <h2 id="level-title">{t.level(standing.level)}</h2>
          <p className="level-total">{t.xpAmount(standing.total)}</p>
          <Progress value={standing.earned} max={standing.needed} label={t.levelProgressLabel} text={t.levelProgress(standing.earned, standing.needed)} />
          <p>{t.levelRemaining(standing.remaining)}</p>
          <p className="level-free">
            {t.xpFree(freeXpOf(saved))}
            <Link to="/homestead" id="level-homestead" onClick={() => setOpen(false)}>
              {t.toHomestead}
            </Link>
          </p>
          <details>
            <summary>{t.levelHow}</summary>
            {t.levelRules.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </details>
        </PopoverContent>
      </Popover>
      {/* Decoration: the lesson's live region says the same aloud. */}
      {burst && (
        <span key={burst.key} className={`level-bubble${burst.level ? " is-level-up" : ""}`} aria-hidden="true">
          {burst.level ? t.levelNew(burst.level) : t.xpGain(burst.gain)}
        </span>
      )}
    </span>
  );
}
