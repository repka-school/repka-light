import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

// The h1 every screen moves focus to after navigation.

export const SCREEN_TITLE_ID = "screen-title";

export function PageHeading({ id = SCREEN_TITLE_ID, className, ...props }: ComponentProps<"h1">) {
  return <h1 id={id} tabIndex={-1} className={cn(className)} {...props} />;
}
