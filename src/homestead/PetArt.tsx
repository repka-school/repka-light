import type { PetKind } from "./pets";

function CatHead() {
  return (
    <>
      <path d="M-4.5 -4l1 -6.5 4 4.5zM1 -5.5l4.5 -4.5 0.5 6.5z" className="p-cat" />
      <circle r="6" className="p-cat" />
      <ellipse cx="3.5" cy="2" rx="3" ry="2.2" className="p-cat-light" />
      <path d="M-2 -5.6v2.4M0.4 -6v2.4" className="p-cat-mark" />
      <circle cx="2" cy="-1" r="1" className="p-ink" />
      <circle cx="6" cy="1.4" r="0.8" className="p-nose" />
    </>
  );
}

function Cat({ sitting }: { sitting: boolean }) {
  if (sitting) {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="10" ry="3.2" className="p-shadow" />
        <path d="M-5 -2q-9 1 -8 -6" className="p-tail p-cat-line" />
        <path d="M-6 0C-8 -8 -4 -15 1 -15C6 -15 7 -8 6 0Z" className="p-cat" />
        <path d="M2 -12C5 -10 5.5 -4 5 0L1.5 0C2.5 -4 2.5 -9 2 -12Z" className="p-cat-light" />
        <g transform="translate(3 -19)">
          <CatHead />
        </g>
      </>
    );
  }
  return (
    <>
      <ellipse cx="0" cy="0.5" rx="12" ry="3.4" className="p-shadow" />
      <path d="M-10 -10q-7 -1 -7 -11" className="p-tail p-cat-line" />
      <line x1="-7" y1="-7" x2="-7" y2="0" className="p-leg p-leg-a p-cat-line-far" />
      <line x1="6" y1="-7" x2="6" y2="0" className="p-leg p-leg-b p-cat-line-far" />
      <ellipse cx="0" cy="-10" rx="11" ry="5.5" className="p-cat" />
      <path d="M-5 -15.2v3M-1 -15.5v3M3 -15.2v3" className="p-cat-mark" />
      <line x1="-4" y1="-7" x2="-4" y2="0" className="p-leg p-leg-b p-cat-line" />
      <line x1="9" y1="-7" x2="9" y2="0" className="p-leg p-leg-a p-cat-line" />
      <g transform="translate(11 -15)">
        <CatHead />
      </g>
    </>
  );
}

function DogHead() {
  return (
    <>
      <circle r="7" className="p-dog" />
      <ellipse cx="6.5" cy="2" rx="5" ry="3.6" className="p-dog-light" />
      <ellipse cx="-3.5" cy="1" rx="3.2" ry="6" transform="rotate(18 -3.5 1)" className="p-dog-dark" />
      <circle cx="2" cy="-2" r="1.1" className="p-ink" />
      <circle cx="10.5" cy="1" r="1.4" className="p-ink" />
    </>
  );
}

function Dog({ sitting }: { sitting: boolean }) {
  if (sitting) {
    return (
      <>
        <ellipse cx="0" cy="0.5" rx="12" ry="3.6" className="p-shadow" />
        <path d="M-7 -3q-8 -1 -8 -9" className="p-tail p-wag p-dog-line" />
        <path d="M-8 0C-10 -10 -5 -19 2 -19C8 -19 9 -9 8 0Z" className="p-dog" />
        <path d="M3 -15C7 -12 7.5 -5 7 0L2.5 0C3.5 -5 3.5 -11 3 -15Z" className="p-dog-light" />
        <path d="M-2 -18q4 3 9 1" className="p-collar" />
        <g transform="translate(5 -24)">
          <DogHead />
        </g>
      </>
    );
  }
  return (
    <>
      <ellipse cx="0" cy="0.5" rx="15" ry="3.8" className="p-shadow" />
      <path d="M-13 -15q-5 -4 -3 -10" className="p-tail p-wag p-dog-line" />
      <line x1="-9" y1="-8" x2="-9" y2="0" className="p-leg p-leg-a p-dog-line-far" />
      <line x1="9" y1="-8" x2="9" y2="0" className="p-leg p-leg-b p-dog-line-far" />
      <rect x="-14" y="-19" width="27" height="12" rx="6" className="p-dog" />
      <ellipse cx="2" cy="-8.4" rx="8" ry="1.8" className="p-dog-light" />
      <line x1="-6" y1="-8" x2="-6" y2="0" className="p-leg p-leg-b p-dog-line" />
      <line x1="12" y1="-8" x2="12" y2="0" className="p-leg p-leg-a p-dog-line" />
      <path d="M8 -18q4 4 8 3" className="p-collar" />
      <g transform="translate(15 -22)">
        <DogHead />
      </g>
    </>
  );
}

export function PetArt({ kind, walking }: { kind: PetKind; walking: boolean }) {
  return kind === "cat" ? <Cat sitting={!walking} /> : <Dog sitting={!walking} />;
}
