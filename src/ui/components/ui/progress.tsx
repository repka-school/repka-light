import * as React from "react"
import { cn } from "../../lib/utils"

function Progress({
  value,
  max = 100,
  strong,
  label,
  text,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  value: number
  max?: number
  /** A part of `value` drawn darker, over the rest drawn lighter: say, the tasks solved on the first try among those answered. */
  strong?: number
  label: string
  text?: string
}) {
  const bounded = Math.min(Math.max(value, 0), Math.max(max, 0))
  const percent = max > 0 ? Math.round((bounded / max) * 100) : 0
  // The darker part, as a share of the lighter fill it sits in.
  const strongShare = strong === undefined ? null : bounded > 0 ? (100 * Math.min(Math.max(strong, 0), bounded)) / bounded : 0
  return (
    <div data-slot="progress" className={cn("flex items-center gap-3", className)} {...props}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={bounded}
        aria-valuetext={text}
        className="h-2 flex-1 overflow-hidden rounded-full bg-progress-track"
      >
        {strongShare === null ? (
          <div className="h-full bg-progress-fill transition-[width]" style={{ width: `${percent}%` }} />
        ) : (
          <div className="relative h-full bg-progress-fill/35 transition-[width]" style={{ width: `${percent}%` }}>
            <div className="absolute inset-y-0 left-0 bg-progress-fill transition-[width]" style={{ width: `${strongShare}%` }} />
          </div>
        )}
      </div>
      {text ? <span className="text-sm font-medium tabular-nums">{text}</span> : null}
    </div>
  )
}

export { Progress }
