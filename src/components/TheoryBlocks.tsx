import { useId, useState } from "react";
import { RichBody } from "@/ui/components/RichBody";
import { Button } from "@/ui/components/ui/button";
import { Picture } from "@/ui/pictures/Picture";
import { TheoryPicture } from "@/ui/pictures/TheoryPicture";
import type { TheoryBlock, TheoryItem } from "@/content/types";
import { bodyLabels, t } from "@/strings";

/** The guide of every theory card: it says the card's opening lines. */
const GUIDE = { avatar: "owlet", frame: "none" };

type ListBlock = Extract<TheoryBlock, { kind: "steps" | "facts" | "tiles" }>;
type TryBlock = Extract<TheoryBlock, { kind: "try" }>;

/** A theory card's blocks, one after another. */
export function TheoryBlocks({ blocks }: { blocks: TheoryBlock[] }) {
  return (
    <div className="theory-blocks">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: TheoryBlock }) {
  switch (block.kind) {
    case "says":
      return (
        <div className="theory-says">
          <Picture of={GUIDE} size={64} className="theory-guide" />
          <p className="theory-bubble">{block.text}</p>
        </div>
      );
    case "steps":
    case "facts":
    case "tiles":
      return <List block={block} />;
    case "image":
      return <RichBody html={block.html} className="theory-image" {...bodyLabels} />;
    case "try":
      return <Try block={block} />;
    case "tip":
      return (
        <div className="theory-tip">
          <TheoryPicture name={block.picture} size={48} />
          <p>{block.text}</p>
        </div>
      );
  }
}

/** Steps are numbered rows, facts are the same rows without numbers, tiles stand side by side. */
function List({ block }: { block: ListBlock }) {
  const Tag = block.kind === "steps" ? "ol" : "ul";
  const row = block.kind === "tiles" ? "theory-tile" : "theory-row";
  const list = (
    <Tag className={block.kind === "tiles" ? "theory-tiles" : "theory-rows"}>
      {block.items.map((item, i) => (
        <li key={i} className={row}>
          <span className="theory-item-picture">
            <TheoryPicture name={item.picture} size={64} />
            {block.kind === "steps" && (
              <span className="theory-step-number" aria-hidden="true">
                {i + 1}
              </span>
            )}
          </span>
          <ItemWords item={item} />
        </li>
      ))}
    </Tag>
  );
  if (!block.title) return list;
  return (
    <section className="theory-section">
      <h2>{block.title}</h2>
      {list}
    </section>
  );
}

function ItemWords({ item }: { item: TheoryItem }) {
  return (
    <span className="theory-item-words">
      <strong>{item.title}</strong>
      {item.text && <span>{item.text}</span>}
    </span>
  );
}

/** A riddle to think over; its answer stays hidden until asked for. */
function Try({ block }: { block: TryBlock }) {
  const [shown, setShown] = useState(false);
  const answerId = useId();
  return (
    <section className="theory-try">
      <h2>{block.title || t.theoryTry}</h2>
      <p className="theory-try-text">{block.text}</p>
      <Button type="button" variant="outline" className="secondary theory-reveal" aria-expanded={shown} aria-controls={answerId} onClick={() => setShown(!shown)}>
        {shown ? t.theoryHideAnswer : t.theoryShowAnswer}
      </Button>
      {/* Always in the page, empty while closed, so that the opened answer is read out. */}
      <div id={answerId} className="theory-answer" role="status">
        {shown && (
          <>
            {block.picture && <TheoryPicture name={block.picture} size={72} />}
            <p>{block.answer}</p>
          </>
        )}
      </div>
    </section>
  );
}
