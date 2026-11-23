import { useId, type ReactNode } from "react";
import { cn } from "../lib/utils";

// The small drawings of a theory card, as inline SVG on a 64-unit square, each on its own tinted tile.
// Fills are fixed colours. The content build knows the same names (THEORY_PICTURES in scripts/build-content.mjs).

type Sketch = { bg: string; draw: () => ReactNode };

const INK = "#2d2a26";
const GREEN = "#236344";
const LEAF = "#6cae7f";
const ORANGE = "#cc792f";
const YELLOW = "#f2b134";
const BLUE = "#3f7cc4";
const SKY = "#8db5e3";
const PINK = "#e0567a";
const PURPLE = "#7b5cc4";
const WOOD = "#b3764a";
const LINE = "#b9c4b4";
const EDGE = "#7f9486";

// Tile tints.
const MINT = "#e6f0ea";
const CREAM = "#fbf1e0";
const PALE_BLUE = "#e3edf8";
const PALE_LEAF = "#e4f0de";
const LILAC = "#f1ecf8";
const ROSE = "#fbe9ee";

const sparkle = (x: number, y: number, r: number) => (
  <path d={`M${x} ${y - r} q${r * 0.18} ${r * 0.82} ${r} ${r} q${-r * 0.82} ${r * 0.18} ${-r} ${r} q${-r * 0.18} ${-r * 0.82} ${-r} ${-r} q${r * 0.82} ${-r * 0.18} ${r} ${-r} Z`} fill={YELLOW} />
);

const button = (x: number, y: number, fill: string, hole: string) => (
  <>
    <circle cx={x} cy={y} r="10.5" fill={fill} />
    <circle cx={x} cy={y} r="6.8" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".55" />
    <circle cx={x - 2.6} cy={y} r="1.5" fill={hole} />
    <circle cx={x + 2.6} cy={y} r="1.5" fill={hole} />
  </>
);

/** A few characters, centred at (x, y). */
const glyph = (text: string, fill: string, size: number, x = 32, y = 32) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight="700" fill={fill}>
    {text}
  </text>
);

/** A question mark centred at (x, y), `scale` times the one in the speech bubble. */
const questionMark = (x: number, y: number, scale: number, stroke: string) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-6.5 -8.5 a6.5 6.5 0 1 1 10 5.5 c-2.6 1.6 -3.5 2.8 -3.5 5" stroke={stroke} strokeWidth="4.6" strokeLinecap="round" fill="none" />
    <circle cx="0" cy="8.4" r="2.7" fill={stroke} />
  </g>
);

/** A white sign on a round badge: a plus, or a minus. */
const sign = (x: number, y: number, r: number, fill: string, plus: boolean) => (
  <>
    <circle cx={x} cy={y} r={r} fill={fill} />
    <path d={`M${x - r * 0.5} ${y} h${r}${plus ? ` M${x} ${y - r * 0.5} v${r}` : ""}`} stroke="#fff" strokeWidth={r * 0.3} strokeLinecap="round" />
  </>
);

/** Square cells in rows and columns from (x, y); `fill` colours each cell by its column and row. */
const cells = (x: number, y: number, cols: number, rows: number, size: number, fill: (col: number, row: number) => string, stroke = EDGE, width = 1.4) =>
  Array.from({ length: rows * cols }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return <rect key={i} x={x + col * size} y={y + row * size} width={size} height={size} fill={fill(col, row)} stroke={stroke} strokeWidth={width} />;
  });

const openBook = () => (
  <>
    <path d="M7 22 h50 v30 q0 3 -3 3 h-44 q-3 0 -3 -3 Z" fill="#2f7a4f" />
    <path d="M10 19 q11 -5 22 2 v31 q-11 -6 -22 -2 Z" fill="#fff" />
    <path d="M54 19 q-11 -5 -22 2 v31 q11 -6 22 -2 Z" fill="#fff8ea" />
    <path d="M15 27 q6 -2 12 1 M15 33 q6 -2 12 1 M15 39 q6 -2 12 1 M37 28 q6 -3 12 -1 M37 34 q6 -3 12 -1 M37 40 q6 -3 12 -1" stroke={LINE} strokeWidth="2" strokeLinecap="round" fill="none" />
  </>
);

/** Two overlapping circles in a frame, with one of the four regions coloured. */
const venn = (region: "left" | "both" | "right" | "out") => {
  const on = YELLOW;
  return (
    <>
      <rect x="5" y="10" width="54" height="44" rx="6" fill={region === "out" ? on : "#fff"} stroke={EDGE} strokeWidth="1.6" />
      <circle cx="25" cy="32" r="15" fill={region === "left" ? on : "#fff"} />
      <circle cx="39" cy="32" r="15" fill={region === "right" ? on : "#fff"} />
      <path d="M32 18.73 A15 15 0 0 1 32 45.27 A15 15 0 0 1 32 18.73 Z" fill={region === "both" ? on : "#fff"} />
      <circle cx="25" cy="32" r="15" fill="none" stroke={PINK} strokeWidth="2.2" />
      <circle cx="39" cy="32" r="15" fill="none" stroke={BLUE} strokeWidth="2.2" />
    </>
  );
};

/** A glass narrowing downwards, `level` of it (0 to 1) full of water. */
const glass = (x: number, top: number, width: number, height: number, level: number) => {
  const taper = width * 0.13;
  const bottom = top + height;
  const inset = (y: number) => (taper * (y - top)) / height;
  const water = bottom - level * (height - 4);
  return (
    <>
      <path d={`M${x} ${top} h${width} l${-taper} ${height} h${-(width - 2 * taper)} Z`} fill="#fff" />
      {level > 0 && <path d={`M${x + inset(water)} ${water} H${x + width - inset(water)} L${x + width - taper} ${bottom} H${x + taper} Z`} fill="#6aa5e0" />}
      <path d={`M${x} ${top} l${taper} ${height} h${width - 2 * taper} l${taper} ${-height}`} fill="none" stroke={EDGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
};

const drop = (x: number, y: number) => <path d={`M${x} ${y - 4.5} q4 5 0 8 q-4 -3 0 -8 Z`} fill="#6aa5e0" />;

/** A cube seen from a corner; (x, y) is the middle of its top face. */
const isoCube = (x: number, y: number, w: number, h: number, side: number, [top, left, right]: [string, string, string]) => (
  <>
    <path d={`M${x} ${y - h} L${x + w} ${y} L${x} ${y + h} L${x - w} ${y} Z`} fill={top} />
    <path d={`M${x - w} ${y} L${x} ${y + h} V${y + h + side} L${x - w} ${y + side} Z`} fill={left} />
    <path d={`M${x + w} ${y} L${x} ${y + h} V${y + h + side} L${x + w} ${y + side} Z`} fill={right} />
  </>
);

/** A 5 by 5 board with a piece in the middle and a dot on every cell it can move to. */
const board = (moves: [col: number, row: number][]) => (
  <>
    {cells(7, 7, 5, 5, 10, (col, row) => ((col + row) % 2 ? "#cfdccb" : "#fff"), EDGE, 0.8)}
    {moves.map(([col, row]) => (
      <circle key={`${col}-${row}`} cx={12 + col * 10} cy={12 + row * 10} r="2.9" fill={ORANGE} />
    ))}
    <circle cx="32" cy="32" r="4.2" fill={INK} />
  </>
);

const starPoints = (x: number, y: number, outer: number, inner: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    return `${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

const sketches: Record<string, Sketch> = {
  // An open book: read.
  book: { bg: MINT, draw: openBook },
  // The book with a «×2» badge: read it twice.
  reread: {
    bg: MINT,
    draw: () => (
      <>
        {openBook()}
        <circle cx="50" cy="14" r="10" fill={ORANGE} />
        <path d="M43.6 11.2 l5 5.6 M48.6 11.2 l-5 5.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M51.8 12.2 q0 -2.4 2.5 -2.4 q2.5 0 2.5 2.2 q0 1.6 -5 5.2 h5.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  // A question mark in a speech bubble: find the question.
  question: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M20 43 l-5 12 l14 -8 Z" fill={BLUE} />
        <circle cx="32" cy="29" r="20" fill={BLUE} />
        {questionMark(32, 33, 1, "#fff")}
      </>
    ),
  },
  // A lens over one number, another left aside: pick what is needed.
  magnifier: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M48 8.5 q4.4 -3 7 .4 q2 3 -1.4 5.3 q3.6 .4 3.6 4.3 q0 4.4 -5 4.4 q-3.2 0 -4.6 -2.4" stroke="#c8b99a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M40 42 L52 54" stroke={ORANGE} strokeWidth="7.5" strokeLinecap="round" />
        <circle cx="29" cy="31" r="14.5" fill="#fff" stroke={GREEN} strokeWidth="4.6" />
        <path d="M33.5 23.5 h-7.4 l-1.1 7.2 q2.2 -1.5 4.8 -1.5 q4.2 0 4.2 4.4 q0 4.6 -4.8 4.6 q-3.1 0 -4.8 -2.2" stroke={GREEN} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  // A tick with sparkles: check yourself.
  check: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <circle cx="31" cy="34" r="20" fill="#387247" />
        <path d="M21 35 l7 7 l14 -15" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {sparkle(53, 13, 6)}
        {sparkle(10, 12, 3.6)}
      </>
    ),
  },
  // A pencil drawing a wavy line: draw.
  pencil: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M17 52 q5 6 10 1 t10 1 t10 -1 t7 1" stroke={GREEN} strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <g transform="rotate(40 32 32)">
          <rect x="26.5" y="2" width="11" height="8" rx="3" fill="#e8847a" />
          <rect x="26.5" y="8" width="11" height="5" fill="#c9cdc4" />
          <rect x="26.5" y="13" width="11" height="29" fill={YELLOW} />
          <rect x="30.2" y="13" width="3.6" height="29" fill="#f6c95e" />
          <path d="M26.5 42 h11 l-5.5 12 Z" fill="#f1dcc0" />
          <path d="M29.9 49.4 h4.2 l-2.1 4.6 Z" fill={INK} />
        </g>
      </>
    ),
  },
  // A sheet with three marked lines: write the variants down.
  list: {
    bg: MINT,
    draw: () => (
      <>
        <rect x="14" y="8" width="36" height="48" rx="5" fill="#fff" stroke="#cfd6c8" strokeWidth="1.5" />
        <circle cx="23" cy="21" r="3.4" fill={PINK} />
        <circle cx="23" cy="32" r="3.4" fill={BLUE} />
        <circle cx="23" cy="43" r="3.4" fill={YELLOW} />
        <path d="M31 21 h12 M31 32 h9 M31 43 h12" stroke={LINE} strokeWidth="3.2" strokeLinecap="round" />
      </>
    ),
  },
  // Three buttons: count with things.
  counters: {
    bg: LILAC,
    draw: () => (
      <>
        {button(21, 22, PINK, "#a93755")}
        {button(44, 26, BLUE, "#2b5b93")}
        {button(29, 45, YELLOW, "#b07d12")}
      </>
    ),
  },
  // A steaming cup: take a break.
  cup: {
    bg: MINT,
    draw: () => (
      <>
        <path d="M24 19 q-3.5 -4 0 -8 M34 19 q-3.5 -4 0 -8" stroke="#9fb3a4" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M43 29 h3.5 a6.5 6.5 0 0 1 0 13 h-5" stroke="#e2703a" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M15 25 h28 v11 a14 14 0 0 1 -28 0 Z" fill="#e2703a" />
        <path d="M15 30 h28 v4 h-28 Z" fill="#fff" opacity=".85" />
        <ellipse cx="29" cy="54" rx="18" ry="3.2" fill="#c3cfc4" />
      </>
    ),
  },
  // A sheet with one corner cut off and its five corners marked.
  corner: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M45 6 h12 v12 Z" fill="#fff" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" strokeDasharray="2.6 2.4" opacity=".7" />
        <path d="M10 14 h28 l14 14 v24 h-42 Z" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        {[
          [10, 14],
          [38, 14],
          [52, 28],
          [52, 52],
          [10, 52],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6" fill={PINK} />
        ))}
      </>
    ),
  },

  // Signs and characters.
  plus: { bg: PALE_LEAF, draw: () => sign(32, 32, 19, "#387247", true) },
  minus: { bg: CREAM, draw: () => sign(32, 32, 19, ORANGE, false) },
  // A plus and a minus: undo an action with its opposite.
  plusminus: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        {sign(22, 23, 13, "#387247", true)}
        {sign(43, 42, 13, ORANGE, false)}
      </>
    ),
  },
  brackets: { bg: PALE_BLUE, draw: () => glyph("( )", BLUE, 32, 32, 30) },
  letter: { bg: LILAC, draw: () => glyph("А", PURPLE, 36) },
  // The unknown of an equation.
  variable: { bg: PALE_BLUE, draw: () => glyph("x", BLUE, 44, 32, 29) },
  // A triangle with its corners marked.
  triangle: {
    bg: LILAC,
    draw: () => (
      <>
        <path d="M11 50 L27 13 L54 50 Z" fill="#fff" stroke={PURPLE} strokeWidth="3.4" strokeLinejoin="round" />
        {[
          [11, 50],
          [27, 13],
          [54, 50],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="4.2" fill={PURPLE} />
        ))}
      </>
    ),
  },
  zero: { bg: MINT, draw: () => glyph("0", GREEN, 36) },
  two: { bg: CREAM, draw: () => glyph("2", ORANGE, 36) },
  four: { bg: ROSE, draw: () => glyph("4", PINK, 36) },
  roman: { bg: CREAM, draw: () => glyph("VIII", "#7a5a1e", 21) },
  // An arrow to the right: go in order.
  arrow: {
    bg: PALE_LEAF,
    draw: () => <path d="M12 32 h36 M36 19 l13 13 l-13 13" stroke={GREEN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  // Two arrows in a circle: change something and go again.
  swap: {
    bg: LILAC,
    draw: () => (
      <path
        d="M14 28 q4 -14 18 -14 q9 0 15 7 M48 12 v10 h-10 M50 36 q-4 14 -18 14 q-9 0 -15 -7 M16 52 v-10 h10"
        stroke={PURPLE}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  // Two triangles pointing back: go from the end.
  rewind: {
    bg: LILAC,
    draw: () => <path d="M30 17 v30 l-19 -15 Z M53 17 v30 l-19 -15 Z" fill={PURPLE} stroke={PURPLE} strokeWidth="4" strokeLinejoin="round" />,
  },

  // A table of names and things with plus and minus marks.
  table: {
    bg: MINT,
    draw: () => (
      <>
        {cells(11, 11, 3, 3, 14, (col, row) => (col === 0 || row === 0 ? "#cbe0d2" : "#fff"))}
        <path d="M28 32 h8 M32 28 v8 M42 46 h8 M46 42 v8" stroke="#387247" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M42 32 h8 M28 46 h8" stroke={ORANGE} strokeWidth="2.8" strokeLinecap="round" />
      </>
    ),
  },
  // A knight's shield with a tick: tells the truth.
  shield: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M32 8 l20 6 v16 q0 17 -20 26 q-20 -9 -20 -26 v-16 Z" fill={BLUE} />
        <path d="M32 8 l20 6 v16 q0 17 -20 26 Z" fill="#5a93d6" />
        <path d="M23 31 l6.5 6.5 l12 -13" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  // A carnival mask: does not tell the truth.
  mask: {
    bg: LILAC,
    draw: () => (
      <>
        <path d="M49 36 L57 56" stroke={WOOD} strokeWidth="3" strokeLinecap="round" />
        <path d="M8 24 q24 -10 48 0 q2 15 -10 18 q-9 2 -14 -7 q-5 9 -14 7 q-12 -3 -10 -18 Z" fill={PURPLE} />
        <ellipse cx="21" cy="30" rx="5.6" ry="3.8" fill={LILAC} />
        <ellipse cx="43" cy="30" rx="5.6" ry="3.8" fill={LILAC} />
        {sparkle(52, 11, 4.2)}
      </>
    ),
  },
  // A light bulb: an idea, a guess.
  bulb: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M32 4 v4 M13 11 l3 3 M51 11 l-3 3 M7 28 h4 M53 28 h4" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M32 12 a15 15 0 0 1 8 27.7 v2.3 h-16 v-2.3 a15 15 0 0 1 8 -27.7 Z" fill={YELLOW} />
        <path d="M24.5 23 q2 -5.5 7.5 -6.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".8" />
        <rect x="25" y="42" width="14" height="9" rx="3" fill="#9aa598" />
        <path d="M27 46.5 h10" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
        <path d="M29 53 h6" stroke="#7f9486" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  "venn-left": { bg: PALE_BLUE, draw: () => venn("left") },
  "venn-both": { bg: PALE_BLUE, draw: () => venn("both") },
  "venn-right": { bg: PALE_BLUE, draw: () => venn("right") },
  "venn-out": { bg: PALE_BLUE, draw: () => venn("out") },
  // A circle, a square, and again: a row that repeats.
  pattern: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <circle cx="10" cy="29" r="6" fill={PINK} />
        <rect x="19" y="23" width="12" height="12" rx="2.4" fill={BLUE} />
        <circle cx="40" cy="29" r="6" fill={PINK} />
        <rect x="49" y="23" width="12" height="12" rx="2.4" fill={BLUE} />
        <path d="M4 41 v4 h27 v-4" stroke={ORANGE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  // Three cells in a row, the middle one unknown.
  cells: {
    bg: CREAM,
    draw: () => (
      <>
        {cells(8, 24, 3, 1, 16, (col) => (col === 1 ? "#fde3b5" : "#fff"))}
        {glyph("2", GREEN, 12, 16, 32)}
        {questionMark(32, 32, 0.42, ORANGE)}
        {glyph("5", GREEN, 12, 48, 32)}
      </>
    ),
  },
  // Things gathered in pairs, none left over.
  pairs: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <rect x="9" y="13" width="46" height="16" rx="8" fill="#fff" stroke="#387247" strokeWidth="1.8" />
        <rect x="9" y="35" width="46" height="16" rx="8" fill="#fff" stroke="#387247" strokeWidth="1.8" />
        <circle cx="22" cy="21" r="5" fill={BLUE} />
        <circle cx="42" cy="21" r="5" fill={BLUE} />
        <circle cx="22" cy="43" r="5" fill={BLUE} />
        <circle cx="42" cy="43" r="5" fill={BLUE} />
      </>
    ),
  },
  // A pair and one thing left alone.
  odd: {
    bg: CREAM,
    draw: () => (
      <>
        <rect x="9" y="11" width="46" height="16" rx="8" fill="#fff" stroke="#387247" strokeWidth="1.8" />
        <circle cx="22" cy="19" r="5" fill={BLUE} />
        <circle cx="42" cy="19" r="5" fill={BLUE} />
        <circle cx="32" cy="43" r="10" fill="none" stroke={ORANGE} strokeWidth="1.8" strokeDasharray="3 2.6" />
        <circle cx="32" cy="43" r="5" fill={PINK} />
      </>
    ),
  },
  // A tree of choices: one start, two branches, two more from each.
  tree: {
    bg: MINT,
    draw: () => (
      <>
        <path d="M32 12 L17 32 M32 12 L47 32 M17 32 L10 52 M17 32 L24 52 M47 32 L40 52 M47 32 L54 52" stroke={EDGE} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="32" cy="12" r="5" fill={GREEN} />
        <circle cx="17" cy="32" r="4.4" fill={BLUE} />
        <circle cx="47" cy="32" r="4.4" fill={BLUE} />
        <circle cx="10" cy="52" r="4" fill={YELLOW} />
        <circle cx="24" cy="52" r="4" fill={PINK} />
        <circle cx="40" cy="52" r="4" fill={YELLOW} />
        <circle cx="54" cy="52" r="4" fill={PINK} />
      </>
    ),
  },
  // Two joined dots: a pair.
  pair: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M20 32 H44" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="19" cy="32" r="10" fill={PINK} />
        <circle cx="45" cy="32" r="10" fill={BLUE} />
      </>
    ),
  },
  // A sack with a question mark: take without looking.
  bag: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M22 22 q-12 11 -10 25 q1 9 10 9 h20 q9 0 10 -9 q2 -14 -10 -25 Z" fill="#c98a5a" />
        <path d="M21 22 q11 4 22 0 l4 -10 q-15 6 -30 0 Z" fill={WOOD} />
        <path d="M21 22 h22" stroke="#7a4f2e" strokeWidth="3" strokeLinecap="round" />
        {questionMark(32, 39, 0.72, "#fff")}
      </>
    ),
  },
  chicken: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M25 45 v9 M34 45 v9 M21 54 h8 M30 54 h8" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M17 31 q-8 -5 -6 -14 q7 2 9 10 Z" fill="#fff" stroke="#d7c9ad" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="40" cy="14.5" r="3" fill={PINK} />
        <circle cx="44.5" cy="12.5" r="3" fill={PINK} />
        <circle cx="48.5" cy="15" r="3" fill={PINK} />
        <ellipse cx="29" cy="34" rx="16" ry="13" fill="#fff" stroke="#d7c9ad" strokeWidth="1.2" />
        <circle cx="43" cy="22" r="8.5" fill="#fff" stroke="#d7c9ad" strokeWidth="1.2" />
        <path d="M37 27 q4 2 7 -1" stroke="#fff" strokeWidth="3" />
        <path d="M51 20 l7 2.6 l-7 2.6 Z" fill={ORANGE} />
        <circle cx="45.5" cy="20.5" r="1.5" fill={INK} />
        <path d="M21 33 q8 8 16 0" stroke="#d7c9ad" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  rabbit: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <path d="M20 48 v7 M27 50 v5 M36 50 v5 M43 48 v7" stroke="#a8998a" strokeWidth="3.6" strokeLinecap="round" />
        <ellipse cx="40.5" cy="13" rx="3.4" ry="9.5" transform="rotate(-10 40.5 13)" fill="#d9cfc2" />
        <ellipse cx="48.5" cy="14" rx="3.4" ry="9.5" transform="rotate(14 48.5 14)" fill="#d9cfc2" />
        <ellipse cx="40.5" cy="14" rx="1.4" ry="6" transform="rotate(-10 40.5 14)" fill="#f2b9c4" />
        <circle cx="14" cy="38" r="4.6" fill="#fff" />
        <ellipse cx="30" cy="40" rx="16" ry="11.5" fill="#d9cfc2" />
        <circle cx="44" cy="29" r="9.5" fill="#d9cfc2" />
        <circle cx="47" cy="27.5" r="1.5" fill={INK} />
        <circle cx="53" cy="31" r="1.5" fill={PINK} />
      </>
    ),
  },
  // Four cells with one of them marked: count the smallest first.
  "grid-small": {
    bg: MINT,
    draw: () => (
      <>
        {cells(12, 12, 2, 2, 20, (col, row) => (col === 0 && row === 0 ? "#f9d98a" : "#fff"))}
        <rect x="12" y="12" width="20" height="20" fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
  // The same four cells with the whole square marked: then the ones made of several.
  "grid-big": {
    bg: CREAM,
    draw: () => (
      <>
        {cells(12, 12, 2, 2, 20, () => "#f9d98a")}
        <rect x="12" y="12" width="40" height="40" fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
      </>
    ),
  },
  scissors: {
    bg: ROSE,
    draw: () => (
      <>
        <path d="M21 8 L38 41 M43 8 L26 41" stroke="#9aa598" strokeWidth="4.6" strokeLinecap="round" />
        <circle cx="41.5" cy="48" r="6.4" fill="none" stroke={PINK} strokeWidth="4" />
        <circle cx="22.5" cy="48" r="6.4" fill="none" stroke={PINK} strokeWidth="4" />
        <circle cx="32" cy="29.4" r="2" fill={INK} />
      </>
    ),
  },
  // Two parts that match exactly.
  equal: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <path d="M8 18 h8 v16 h8 v10 h-16 Z M40 18 h8 v16 h8 v10 h-16 Z" fill={SKY} stroke={BLUE} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M28.5 29 h7 M28.5 35 h7" stroke="#387247" strokeWidth="2.8" strokeLinecap="round" />
      </>
    ),
  },
  // A square and a strip of four cells each: as many cells, another shape.
  shapes: {
    bg: CREAM,
    draw: () => (
      <>
        {cells(6, 22, 2, 2, 10, () => SKY, BLUE)}
        {cells(44, 12, 1, 4, 10, () => SKY, BLUE)}
        <path d="M30.5 29 h8 M30.5 35 h8 M37 25 l-5 14" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  // Two squares of sticks with one side shared.
  sticks: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M13 22 h14 M35 22 h14 M13 42 h14 M35 42 h14 M10 25 v14 M54 25 v14" stroke="#d9b06a" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M32 25 v14" stroke={ORANGE} strokeWidth="4.4" strokeLinecap="round" />
        {[
          [13, 22],
          [35, 22],
          [13, 42],
          [35, 42],
          [10, 25],
          [54, 25],
          [32, 25],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.7" fill="#a13e2c" />
        ))}
      </>
    ),
  },
  medal: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M22 6 h9 l7 18 l-8 4 Z" fill={PINK} />
        <path d="M42 6 h-9 l-7 18 l8 4 Z" fill="#c23b5d" />
        <circle cx="32" cy="40" r="16" fill={YELLOW} />
        <circle cx="32" cy="40" r="11.5" fill="none" stroke="#d89a1e" strokeWidth="1.6" />
        <polygon points={starPoints(32, 40, 8, 3.4)} fill="#fff" />
      </>
    ),
  },
  // Two speech bubbles: talk it over.
  talk: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M15 31 l-3 9 l10 -7 Z" fill={BLUE} />
        <rect x="7" y="10" width="34" height="24" rx="10" fill={BLUE} />
        <circle cx="17" cy="22" r="2.2" fill="#fff" />
        <circle cx="24" cy="22" r="2.2" fill="#fff" />
        <circle cx="31" cy="22" r="2.2" fill="#fff" />
        <path d="M49 50 l4 8 l-10 -6 Z" fill={YELLOW} />
        <rect x="26" y="31" width="32" height="22" rx="9" fill={YELLOW} />
        <path d="M33 39 h18 M33 45 h12" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
  },
  // Five posts and the four gaps between them.
  posts: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <path d="M7 24 H57 M7 34 H57" stroke="#d9b06a" strokeWidth="3" strokeLinecap="round" />
        {[4, 17, 30, 43, 56].map((x) => (
          <rect key={x} x={x - 0.5} y="14" width="5" height="30" rx="2" fill={WOOD} />
        ))}
        {[1, 2, 3, 4].map((n) => (
          <text key={n} x={-1.5 + n * 13} y="53" textAnchor="middle" dominantBaseline="central" fontSize="9.5" fontWeight="700" fill={GREEN}>
            {n}
          </text>
        ))}
      </>
    ),
  },
  // A log with two cuts marked.
  log: {
    bg: CREAM,
    draw: () => (
      <>
        <rect x="5" y="22" width="52" height="20" rx="10" fill="#c98a5a" />
        <ellipse cx="51" cy="32" rx="6" ry="10" fill="#f1dcc0" />
        <ellipse cx="51" cy="32" rx="2.6" ry="5" fill="none" stroke="#c98a5a" strokeWidth="1.4" />
        <path d="M20 18 V46 M34 18 V46" stroke="#7a4f2e" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3.4" />
      </>
    ),
  },
  bell: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M53 19 q5 7 0 14 M11 19 q-5 7 0 14" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="32" cy="50" r="4.6" fill={ORANGE} />
        <circle cx="32" cy="9" r="3.4" fill={ORANGE} />
        <path d="M32 10 q14 0 14 18 v9 l5 8 h-38 l5 -8 v-9 q0 -18 14 -18 Z" fill={YELLOW} />
        <path d="M24 22 q1 -6 6 -7.4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".8" />
      </>
    ),
  },
  // A birthday cake: a year older.
  cake: {
    bg: ROSE,
    draw: () => (
      <>
        <ellipse cx="32" cy="54" rx="25" ry="3.4" fill="#d9c7cc" />
        <rect x="21" y="17" width="3.4" height="12" rx="1" fill={BLUE} />
        <rect x="30.3" y="14" width="3.4" height="15" rx="1" fill={YELLOW} />
        <rect x="39.6" y="17" width="3.4" height="12" rx="1" fill={LEAF} />
        <ellipse cx="22.7" cy="12.6" rx="2" ry="3" fill={ORANGE} />
        <ellipse cx="32" cy="9.6" rx="2" ry="3" fill={ORANGE} />
        <ellipse cx="41.3" cy="12.6" rx="2" ry="3" fill={ORANGE} />
        <rect x="11" y="32" width="42" height="21" rx="4" fill="#f1dcc0" />
        <path d="M11 35 q0 -7 7 -7 h28 q7 0 7 7 v3 q-3.5 5 -7 0 q-3.5 5 -7 0 q-3.5 5 -7 0 q-3.5 5 -7 0 q-3.5 5 -7 0 q-3.5 5 -7 0 Z" fill={PINK} />
      </>
    ),
  },
  // A grown-up and a child.
  people: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M9 54 q0 -22 12 -22 q12 0 12 22 Z" fill={PURPLE} />
        <circle cx="21" cy="20" r="8" fill="#eec39f" />
        <path d="M36 54 q0 -15 9 -15 q9 0 9 15 Z" fill={PINK} />
        <circle cx="45" cy="30" r="6.2" fill="#eec39f" />
      </>
    ),
  },
  boat: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M31 9 V37" stroke="#7a4f2e" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M34 11 L49 33 H34 Z" fill="#fff" />
        <path d="M28 16 L17 33 H28 Z" fill={YELLOW} />
        <path d="M8 37 H56 L48 49 H16 Z" fill={WOOD} />
        <path d="M2 49 q7.5 -5 15 0 t15 0 t15 0 t15 0 V62 H2 Z" fill={SKY} />
      </>
    ),
  },
  // A glass filled to the brim.
  "jug-full": {
    bg: PALE_BLUE,
    draw: () => (
      <>
        {glass(18, 16, 28, 40, 1)}
        {drop(13, 14)}
        {drop(51, 18)}
      </>
    ),
  },
  // An empty glass, its water poured out.
  "jug-empty": {
    bg: CREAM,
    draw: () => (
      <>
        {glass(10, 16, 28, 40, 0)}
        {drop(46, 22)}
        {drop(52, 35)}
        {drop(46, 48)}
      </>
    ),
  },
  // Water poured from a small glass into a big one.
  "jug-pour": {
    bg: PALE_LEAF,
    draw: () => (
      <>
        {glass(5, 28, 20, 28, 0.35)}
        {glass(33, 16, 26, 40, 0.6)}
        <path d="M14 22 q10 -14 26 -9 M34 8 l7 5 l-7 5" stroke="#387247" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  // Scales with both pans level.
  scales: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        <path d="M32 14 V50 M21 53 H43" stroke="#7a4f2e" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M10 19 H54" stroke="#7a4f2e" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 19 L6 35 M12 19 L18 35 M52 19 L46 35 M52 19 L58 35" stroke={EDGE} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="12" cy="31" r="4" fill={PINK} />
        <circle cx="49.5" cy="32" r="3" fill={BLUE} />
        <circle cx="55" cy="32" r="3" fill={BLUE} />
        <path d="M3 35 H21 q-9 9 -18 0 Z M43 35 H61 q-9 9 -18 0 Z" fill={YELLOW} />
        <circle cx="32" cy="14" r="3.6" fill={ORANGE} />
      </>
    ),
  },
  clock: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <circle cx="32" cy="32" r="21" fill="#fff" stroke={BLUE} strokeWidth="4.4" />
        <path d="M32 15 v4 M32 45 v4 M15 32 h4 M45 32 h4" stroke={EDGE} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 32 V20" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M32 32 L41 37" stroke={ORANGE} strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="32" cy="32" r="2.6" fill={INK} />
      </>
    ),
  },
  calendar: {
    bg: ROSE,
    draw: () => (
      <>
        <rect x="10" y="13" width="44" height="42" rx="7" fill="#fff" stroke="#d9c7cc" strokeWidth="1.4" />
        <path d="M10 27 v-7 q0 -7 7 -7 h30 q7 0 7 7 v7 Z" fill={PINK} />
        <path d="M21 8 v9 M43 8 v9" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={16.5 + (i % 5) * 6.9} y={33 + Math.floor(i / 5) * 9} width="4" height="4" rx="1" fill={LINE} />
        ))}
        <circle cx="39.2" cy="44" r="4.6" fill={ORANGE} />
      </>
    ),
  },
  // Three pebbles: a game of stones.
  stones: {
    bg: MINT,
    draw: () => (
      <>
        <ellipse cx="31" cy="24" rx="11" ry="8" fill="#b4bdb0" />
        <ellipse cx="19" cy="42" rx="12" ry="8.5" fill="#9aa598" />
        <ellipse cx="44" cy="43" rx="13" ry="9" fill={EDGE} />
        <path d="M25 20 q4 -3 9 -2 M12 39 q4 -3 9 -2 M37 40 q4 -3 9 -2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".6" />
      </>
    ),
  },
  // A small square of a sudoku with one number missing.
  sudoku: {
    bg: CREAM,
    draw: () => (
      <>
        {cells(13, 13, 2, 2, 19, (col, row) => (col === 1 && row === 1 ? "#fde3b5" : "#fff"), EDGE, 1.2)}
        <rect x="13" y="13" width="38" height="38" fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        {glyph("1", GREEN, 13, 22.5, 22.5)}
        {glyph("2", GREEN, 13, 41.5, 22.5)}
        {glyph("3", GREEN, 13, 22.5, 41.5)}
        {questionMark(41.5, 41.5, 0.44, ORANGE)}
      </>
    ),
  },
  domino: {
    bg: LILAC,
    draw: () => (
      <>
        <rect x="7" y="19" width="50" height="26" rx="6" fill="#fff" stroke={INK} strokeWidth="1.8" />
        <path d="M32 22 V42" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        {[
          [14.5, 26],
          [24.5, 38],
          [39.5, 26],
          [44.5, 32],
          [49.5, 38],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.8" fill={INK} />
        ))}
      </>
    ),
  },
  // A grid with lettered columns, numbered rows and one cell marked.
  coords: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        {cells(18, 7, 3, 3, 13, (col, row) => (col === 1 && row === 1 ? YELLOW : "#fff"))}
        {glyph("А", GREEN, 9, 24.5, 54)}
        {glyph("Б", GREEN, 9, 37.5, 54)}
        {glyph("В", GREEN, 9, 50.5, 54)}
        {glyph("3", GREEN, 9, 10.5, 13.5)}
        {glyph("2", GREEN, 9, 10.5, 26.5)}
        {glyph("1", GREEN, 9, 10.5, 39.5)}
      </>
    ),
  },
  key: {
    bg: CREAM,
    draw: () => (
      <>
        <path d="M30 32 H56 M45 32 v9 M53 32 v7" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" />
        <circle cx="19" cy="32" r="10" fill="none" stroke={ORANGE} strokeWidth="5.4" />
      </>
    ),
  },
  // Dots joined by lines: towns and roads.
  graph: {
    bg: PALE_BLUE,
    draw: () => (
      <>
        <path d="M14 18 L50 15 L47 48 L16 47 Z M14 18 L47 48" stroke="#5b7fa8" strokeWidth="2.6" strokeLinejoin="round" fill="none" />
        <circle cx="14" cy="18" r="6.4" fill={ORANGE} stroke="#fff" strokeWidth="1.6" />
        <circle cx="50" cy="15" r="6.4" fill={BLUE} stroke="#fff" strokeWidth="1.6" />
        <circle cx="47" cy="48" r="6.4" fill={BLUE} stroke="#fff" strokeWidth="1.6" />
        <circle cx="16" cy="47" r="6.4" fill={BLUE} stroke="#fff" strokeWidth="1.6" />
      </>
    ),
  },
  cube: { bg: LILAC, draw: () => isoCube(32, 20, 21, 11, 24, ["#b7a5e0", PURPLE, "#5f45a3"]) },
  // Six squares in a cross: a cube unfolded.
  net: {
    bg: CREAM,
    draw: () => (
      <>
        {cells(26, 8, 1, 4, 12, () => "#fff", ORANGE, 1.8)}
        {cells(14, 20, 1, 1, 12, () => "#fff", ORANGE, 1.8)}
        {cells(38, 20, 1, 1, 12, () => "#fff", ORANGE, 1.8)}
      </>
    ),
  },
  // Three cubes, one on top: a small building.
  blocks: {
    bg: MINT,
    draw: () => (
      <>
        {isoCube(24, 34, 12, 6.5, 13, ["#a9d3b5", LEAF, "#3f8a56"])}
        {isoCube(24, 21, 12, 6.5, 13, ["#fbe0a0", YELLOW, "#d89a1e"])}
        {isoCube(40, 39, 12, 6.5, 13, ["#a9d3b5", LEAF, "#3f8a56"])}
      </>
    ),
  },
  // How the rook, the bishop and the knight move.
  rook: {
    bg: PALE_LEAF,
    draw: () =>
      board([
        [0, 2],
        [1, 2],
        [3, 2],
        [4, 2],
        [2, 0],
        [2, 1],
        [2, 3],
        [2, 4],
      ]),
  },
  bishop: {
    bg: PALE_LEAF,
    draw: () =>
      board([
        [0, 0],
        [1, 1],
        [3, 3],
        [4, 4],
        [4, 0],
        [3, 1],
        [1, 3],
        [0, 4],
      ]),
  },
  knight: {
    bg: PALE_LEAF,
    draw: () =>
      board([
        [1, 0],
        [3, 0],
        [0, 1],
        [4, 1],
        [0, 3],
        [4, 3],
        [1, 4],
        [3, 4],
      ]),
  },
  // A square cut into the seven parts of a tangram.
  tangram: {
    bg: PALE_BLUE,
    draw: () => (
      <g stroke="#fff" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M10 10 H54 L32 32 Z" fill={PINK} />
        <path d="M10 10 V54 L32 32 Z" fill={BLUE} />
        <path d="M10 54 H32 L21 43 Z" fill={YELLOW} />
        <path d="M21 43 L32 32 L43 43 L32 54 Z" fill={LEAF} />
        <path d="M32 32 L43 21 V43 Z" fill={ORANGE} />
        <path d="M43 21 L54 10 V32 L43 43 Z" fill={PURPLE} />
        <path d="M32 54 L54 32 V54 Z" fill="#3aa3a0" />
      </g>
    ),
  },
  // Five cells joined by whole sides.
  pentomino: {
    bg: PALE_LEAF,
    draw: () => (
      <>
        {cells(26, 14, 1, 3, 12, () => LEAF, "#fff", 1.6)}
        {cells(14, 26, 1, 1, 12, () => LEAF, "#fff", 1.6)}
        {cells(38, 26, 1, 1, 12, () => LEAF, "#fff", 1.6)}
      </>
    ),
  },
  // A heart folded along its line of symmetry.
  mirror: {
    bg: ROSE,
    draw: () => (
      <>
        <path d="M32 51 C13 38 9 26 15.5 18.5 C22 11 30 15 32 22 Z" fill={PINK} />
        <path d="M32 51 C51 38 55 26 48.5 18.5 C42 11 34 15 32 22 Z" fill="#f09bb0" />
        <path d="M32 7 V58" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeDasharray="3.6 3.4" />
      </>
    ),
  },
};

export const theoryPictureIds: readonly string[] = Object.keys(sketches);

/** One drawing by name; an unknown name draws an empty tile. The drawings are decoration: the words beside them say the same. */
export function TheoryPicture({ name, size, className }: { name: string; size: number; className?: string }) {
  const sketch = sketches[name];
  const clip = useId();
  return (
    <svg className={cn("theory-picture", className)} viewBox="0 0 64 64" width={size} height={size} data-picture={sketch ? name : "none"} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <rect width="64" height="64" rx="15" />
        </clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill={sketch?.bg ?? "#eef0e8"} />
      <g clipPath={`url(#${clip})`}>{sketch?.draw()}</g>
    </svg>
  );
}
