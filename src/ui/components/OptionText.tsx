import { RichBody } from "./RichBody";

export type OptionTextLabels = { zoomLabel: string; brokenLabel: string; formulaLabel: string; tableLabel: string };

export function OptionText({ html, ...labels }: { html: string } & OptionTextLabels) {
  return <RichBody as="span" html={html} className="tile-text" {...labels} />;
}

export const hasOptionText = (choices: { html?: string }[]) => choices.length > 0 && choices.every((c) => !!c.html);
