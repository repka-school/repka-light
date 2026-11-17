import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { cn } from "../lib/utils";

// A radio group of pictures. An arrow-key walk reports only the choice it stops on, unless `immediate`.

export const REST_MS = 500;

const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"]);

export type PictureChoicesProps = {
  name: string;

  legend: string;

  groups: readonly PictureGroup[];

  names: Record<string, string>;

  value: string | null;

  onChange: (id: string) => void;

  error?: ReactNode;
  className?: string;

  immediate?: boolean;
  draw: (id: string) => ReactNode;
};

export type PictureGroup = { label?: string; ids: readonly string[] };

type Moved = { id: string };

export function PictureChoices({ name, legend, groups, names, value, onChange, error, className, immediate = false, draw }: PictureChoicesProps) {
  const errorId = useId();
  const groupId = useId();
  const byKey = useRef(false);
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });
  const [moved, setMoved] = useState<Moved | null>(null);
  const rested = useDebouncedValue(moved, REST_MS);
  useEffect(() => {
    if (rested === null || rested !== moved) return;
    setMoved(null);
    report.current(rested.id);
  }, [rested, moved]);

  const pending = useRef<Moved | null>(null);
  useEffect(() => {
    pending.current = moved;
  }, [moved]);
  useEffect(
    () => () => {
      if (pending.current) report.current(pending.current.id);
    },
    [],
  );

  const shown = moved?.id ?? value;
  const onKeyDown = (e: KeyboardEvent) => {
    byKey.current = MOVE_KEYS.has(e.key);
  };
  const pick = (id: string) => {
    const keyed = byKey.current;
    byKey.current = false;
    if (keyed && !immediate) {
      setMoved({ id });
      return;
    }
    setMoved(null);
    onChange(id);
  };

  return (
    <fieldset className={cn("picture-choices", className)} aria-describedby={error ? errorId : undefined}>
      <legend>{legend}</legend>
      <div className="picture-choice-groups" onKeyDown={onKeyDown}>
        {groups.map((group, i) => {
          const choices = (
            <div className="picture-choice-list">
              {group.ids.map((id) => (
                <label key={id} className="picture-choice">
                  <input type="radio" name={name} value={id} checked={shown === id} aria-label={names[id]} onChange={() => pick(id)} />
                  {draw(id)}
                  <span className="picture-choice-mark" aria-hidden="true">
                    ✓
                  </span>
                </label>
              ))}
            </div>
          );
          if (!group.label) return <div key={i}>{choices}</div>;

          return (
            <div key={group.label} role="group" aria-labelledby={`${groupId}-${i}`} className="picture-choice-group">
              <p id={`${groupId}-${i}`} className="picture-choice-group-label">
                {group.label}
              </p>
              {choices}
            </div>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="inline-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
