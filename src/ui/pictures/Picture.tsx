import { useId } from "react";
import { cn } from "../lib/utils";
import { drawings, frameDrawings, neutral } from "./drawings";

// An avatar in its frame: the portrait clipped to a circle, a thin outline, and the frame ring outside it.

export type Pictured = { avatar?: string | null; frame: string };

export type PictureProps = {
  of: Pictured;

  size: number;

  label?: string;
  className?: string;
};

export function Picture({ of, size, label, className }: PictureProps) {
  const clip = useId();
  const avatar = of.avatar ?? null;
  const frame = of.frame;
  const drawing = (avatar !== null && drawings[avatar]) || neutral;
  const ring = frameDrawings[frame] ?? frameDrawings.none;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <svg
      className={cn("picture", className)}
      viewBox="0 0 72 72"
      width={size}
      height={size}
      data-avatar={avatar ?? "none"}
      data-frame={frameDrawings[frame] ? frame : "none"}
      focusable="false"
      {...a11y}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="36" cy="36" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`} data-part="portrait">
        <circle cx="36" cy="36" r="30" fill={drawing.bg} />
        <g transform="translate(4 4)">{drawing.draw()}</g>
      </g>
      <circle className="picture-outline" data-testid="picture-outline" cx="36" cy="36" r="30" fill="none" strokeWidth="1" />
      {ring()}
    </svg>
  );
}
