import { BookOpen } from "lucide-react";
import { PageHeading } from "@/ui/components/PageHeading";
import { RichBody } from "@/ui/components/RichBody";
import { TheoryBlocks } from "@/components/TheoryBlocks";
import type { TheoryCard } from "@/content/types";
import { bodyLabels, t } from "@/strings";

export function TheoryCardView({ card }: { card: TheoryCard }) {
  return (
    <article className="question-card theory-card">
      <div className="theory-heading">
        {card.title && (
          <p className="theory-label">
            <BookOpen aria-hidden="true" />
            {t.theory}
          </p>
        )}
        <PageHeading>{card.title || t.theory}</PageHeading>
      </div>
      {card.body && <RichBody html={card.body} className="question-body" {...bodyLabels} />}
      {card.blocks.length > 0 && <TheoryBlocks key={card.id} blocks={card.blocks} />}
    </article>
  );
}
