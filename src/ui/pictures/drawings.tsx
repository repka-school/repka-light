import type { ReactNode } from "react";

// The avatar and frame artwork, as inline SVG on a 64-unit square. Fills are fixed colours.

export type Drawing = { bg: string; draw: () => ReactNode };

const INK = "#2d2a26";

const skin = {
  s1: ["#f6d7bf", "#e9bd9c"],
  s2: ["#eec39f", "#dca77f"],
  s3: ["#d49b72", "#bf835a"],
  s4: ["#9a6444", "#83523a"],
  s5: ["#74462d", "#613a25"],
} as const;

type Tone = keyof typeof skin;

function face({ tone, adult = false, brows = false, cheeks = true }: { tone: Tone; adult?: boolean; brows?: boolean; cheeks?: boolean }) {
  const [c, shade] = skin[tone];
  const hy = adult ? 27 : 29;
  const rx = adult ? 11 : 12.5;
  const ry = adult ? 13 : 13.5;
  const ey = hy + 1.5;
  return {
    neck: <path d={`M27 ${hy + 8} h10 v10 q-5 3 -10 0 Z`} fill={shade} />,
    head: (
      <>
        <circle cx={32 - rx - 0.6} cy={ey} r="2.6" fill={c} />
        <circle cx={32 + rx + 0.6} cy={ey} r="2.6" fill={c} />
        <ellipse cx="32" cy={hy} rx={rx} ry={ry} fill={c} />
      </>
    ),
    features: (
      <>
        <circle cx="27.4" cy={ey} r="1.55" fill={INK} />
        <circle cx="36.6" cy={ey} r="1.55" fill={INK} />
        {brows && (
          <path
            d={`M25.3 ${ey - 3.6} q2.1 -1.2 4.2 0 M34.5 ${ey - 3.6} q2.1 -1.2 4.2 0`}
            stroke={INK}
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity=".75"
          />
        )}
        <path d={`M28.9 ${ey + 5} q3.1 2.6 6.2 0`} stroke={INK} strokeWidth="1.35" strokeLinecap="round" fill="none" />
        {cheeks && (
          <>
            <circle cx="24.6" cy={ey + 4} r="2.1" fill="#e8847a" opacity=".3" />
            <circle cx="39.4" cy={ey + 4} r="2.1" fill="#e8847a" opacity=".3" />
          </>
        )}
      </>
    ),
    hy,
  };
}

const torso = (fill: string, collar?: ReactNode) => (
  <>
    <path d="M9 66 C9 51 19 45 32 45 C45 45 55 51 55 66 Z" fill={fill} />
    {collar}
  </>
);

const glasses = (y: number, color: string = INK) => (
  <g fill="none" stroke={color} strokeWidth="1.3">
    <circle cx="27.4" cy={y} r="3.7" />
    <circle cx="36.6" cy={y} r="3.7" />
    <path d={`M31.1 ${y} h1.8`} />
  </g>
);

function girlBraids() {
  const f = face({ tone: "s1" });
  const hair = "#9b4a26";
  return (
    <>
      <ellipse cx="17.5" cy="40" rx="4" ry="7.5" fill={hair} />
      <ellipse cx="46.5" cy="40" rx="4" ry="7.5" fill={hair} />
      <circle cx="17.5" cy="32.5" r="2" fill="#e0567a" />
      <circle cx="46.5" cy="32.5" r="2" fill="#e0567a" />
      {torso("#e0567a", <path d="M26 45.5 q6 5 12 0" fill="#fff" opacity=".85" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path
        d="M19.2 28 C19 17 24.5 14.5 32 14.5 C39.5 14.5 45 17 44.8 28 C42 22.5 38 20.5 33 21.5 L32 18.5 L31 21.5 C26 20.5 22 22.5 19.2 28 Z"
        fill={hair}
      />
    </>
  );
}

function girlPuffs() {
  const f = face({ tone: "s5" });
  const hair = "#2a1b15";
  return (
    <>
      <circle cx="18" cy="16" r="7.5" fill={hair} />
      <circle cx="46" cy="16" r="7.5" fill={hair} />
      <circle cx="15" cy="13" r="2.4" fill="#3b2a22" />
      <circle cx="49" cy="13" r="2.4" fill="#3b2a22" />
      {torso("#f2b134", <path d="M26 45.5 q6 4 12 0" fill="#fff" opacity=".7" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M19.4 26 C19.5 18 25 15 32 15 C39 15 44.5 18 44.6 26 C41 21.5 37 20 32 20 C27 20 23 21.5 19.4 26 Z" fill={hair} />
      <rect x="21" y="17.5" width="22" height="2.6" rx="1.3" fill="#7b5cc4" />
    </>
  );
}

function girlBob() {
  const f = face({ tone: "s3" });
  const hair = "#1f1a1d";
  return (
    <>
      <path d="M17 30 C17 17 23.5 13 32 13 C40.5 13 47 17 47 30 L47.5 41 Q47.5 43 45.5 43 L18.5 43 Q16.5 43 16.5 41 Z" fill={hair} />
      {torso("#2f8f6f", <path d="M27 45.5 l5 5 l5 -5" fill="#fff" opacity=".85" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M19.3 25 C20 17.5 25 15 32 15 C39 15 44 17.5 44.7 25 L44.7 26 C38 23.5 26 23.5 19.3 26 Z" fill={hair} />
      <circle cx="42" cy="20" r="2.2" fill="#f2b134" />
    </>
  );
}

function girlPonytail() {
  const f = face({ tone: "s2" });
  const hair = "#d6a13f";
  return (
    <>
      <path d="M42 15 C53 14 56 25 51 36 C50 30 47 25 43 23 Z" fill={hair} />
      {torso("#3f7cc4", <path d="M26 45.5 q6 5 12 0" fill="#fff" opacity=".8" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M19.4 27 C19.5 18 25 15 32 15 C39 15 44.5 18 44.6 27 C40 21 30 19.5 22 22.5 C21 24 20 25.5 19.4 27 Z" fill={hair} />
      <path d="M40.5 15.8 q2.8 1.8 3.4 5" stroke="#e0567a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </>
  );
}

function boySide() {
  const f = face({ tone: "s1" });
  const hair = "#6b4227";
  return (
    <>
      {torso("#3f7cc4", <path d="M26 45.5 q6 5 12 0" fill="#fff" opacity=".85" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M19.3 27 C18.5 17 24 14 31 14 C39 13.5 45.5 17 44.7 26 C43 22 41 20.5 38 20 C33 22.5 26 23 19.3 27 Z" fill={hair} />
    </>
  );
}

const CURLS: [number, number][] = [
  [21, 21],
  [24.5, 17],
  [29, 15],
  [34, 15],
  [38.5, 16.5],
  [42.5, 20],
  [20, 25.5],
  [44, 24.5],
];

function boyCurls() {
  const f = face({ tone: "s3" });
  const hair = "#3b2416";
  return (
    <>
      {torso("#e2703a", <path d="M26 45.5 q6 5 12 0" fill="#fff" opacity=".8" />)}
      {f.neck}
      {f.head}
      {f.features}
      {CURLS.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r="4.3" fill={hair} />
      ))}
    </>
  );
}

function boyGlasses() {
  const f = face({ tone: "s4" });
  const hair = "#1b1411";
  return (
    <>
      {torso("#2f8f6f", <path d="M27 45.5 l5 5 l5 -5" fill="#fff" opacity=".85" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M19.6 24 C20 17 25 15 32 15 C39 15 44 17 44.4 24 C40 21 24 21 19.6 24 Z" fill={hair} />
      {glasses(f.hy + 1.5)}
    </>
  );
}

function boyCap() {
  const f = face({ tone: "s2" });
  return (
    <>
      {torso("#f2b134", <path d="M26 45.5 q6 4 12 0" fill="#fff" opacity=".75" />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M22 21 q-3 3 -2.6 7 l2.4 -3 Z" fill="#c0622d" />
      <path d="M42 21 q3 3 2.6 7 l-2.4 -3 Z" fill="#c0622d" />
      <path d="M19.5 23 C19.5 15.5 25 13 32 13 C39 13 44.5 15.5 44.5 23 Z" fill="#3f7cc4" />
      <path d="M30 22 L50 22 Q52 22 51 24 Q49 26 44 25 L30 25 Z" fill="#2f5f9a" />
      <circle cx="32" cy="13.5" r="1.5" fill="#2f5f9a" />
      <g fill="#b8704a" opacity=".55">
        <circle cx="25" cy="33" r=".7" />
        <circle cx="26.6" cy="34.2" r=".7" />
        <circle cx="39" cy="33" r=".7" />
        <circle cx="37.4" cy="34.2" r=".7" />
      </g>
    </>
  );
}

function womanBun() {
  const f = face({ tone: "s3", adult: true, brows: true, cheeks: false });
  const hair = "#4a2c1d";
  return (
    <>
      <circle cx="32" cy="11" r="6" fill={hair} />
      {torso("#7b5cc4", <path d="M25 45.3 q7 7 14 0" fill={skin.s3[1]} />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M20.4 26 C20 17 25 14 32 14 C39 14 44 17 43.6 26 C41 20 36 18.5 32 18.5 C28 18.5 23 20 20.4 26 Z" fill={hair} />
      <circle cx="20.3" cy="32.5" r="1.3" fill="#f2b134" />
      <circle cx="43.7" cy="32.5" r="1.3" fill="#f2b134" />
    </>
  );
}

function womanLong() {
  const f = face({ tone: "s1", adult: true, brows: true, cheeks: false });
  const hair = "#7a3f22";
  return (
    <>
      <path d="M18 28 C17 15 24 12 32 12 C40 12 47 15 46 28 C46 36 49 42 50 50 L14 50 C15 42 18 36 18 28 Z" fill={hair} />
      {torso("#2f8f6f", <path d="M25 45.3 q7 7 14 0" fill={skin.s1[1]} />)}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M20.4 27 C20.5 18 25 15 32 15 C38 15 43.5 18 43.6 27 C40 21 34 19 28 20.5 C24.5 21.5 22 24 20.4 27 Z" fill={hair} />
    </>
  );
}

function manBeard() {
  const f = face({ tone: "s2", adult: true, brows: true, cheeks: false });
  const hair = "#3a2a20";
  return (
    <>
      {torso("#3f7cc4", <path d="M26 45.3 l6 6 l6 -6" fill="#fff" opacity=".85" />)}
      {f.neck}
      {f.head}
      <path d="M21 29 C21 38 25 41.5 32 41.5 C39 41.5 43 38 43 29 C42 34 39 35 36 34.5 Q32 33.3 28 34.5 C25 35 22 34 21 29 Z" fill={hair} />
      {f.features}
      <path d="M20.6 25 C20 16.5 25 14 32 14 C39 14 44 16.5 43.4 25 C42 21 39 19.5 32 19.5 C25 19.5 22 21 20.6 25 Z" fill={hair} />
    </>
  );
}

function manGlasses() {
  const f = face({ tone: "s5", adult: true, brows: true, cheeks: false });
  const hair = "#8e8a86";
  return (
    <>
      {torso(
        "#4a4f5c",
        <>
          <path d="M26 45.3 l6 6 l6 -6" fill="#fff" opacity=".9" />
          <path d="M31 51 l1 -1.5 l1 1.5 l-0.5 6 h-1 Z" fill="#e0567a" />
        </>,
      )}
      {f.neck}
      {f.head}
      {f.features}
      <path d="M20.8 24 C21 16.5 25.5 14 32 14 C38.5 14 43 16.5 43.2 24 C41 20.5 38 19.3 32 19.3 C26 19.3 23 20.5 20.8 24 Z" fill={hair} />
      {glasses(f.hy + 1.5, "#e8e2d6")}
    </>
  );
}

const animalBody = (fill: string, extra?: ReactNode) => (
  <>
    <path d="M13 66 C13 53 21 48 32 48 C43 48 51 53 51 66 Z" fill={fill} />
    {extra}
  </>
);

const animalEyes = (y: number, left = 26, right = 38, r = 1.8) => (
  <>
    <circle cx={left} cy={y} r={r} fill={INK} />
    <circle cx={right} cy={y} r={r} fill={INK} />
  </>
);

const blush = (left: [number, number], right: [number, number]) => (
  <>
    <circle cx={left[0]} cy={left[1]} r="2.1" fill="#e8847a" opacity=".35" />
    <circle cx={right[0]} cy={right[1]} r="2.1" fill="#e8847a" opacity=".35" />
  </>
);

const smallMouth = (y: number) => (
  <path d={`M32 ${y} q-1.6 2.2 -3.4 1 M32 ${y} q1.6 2.2 3.4 1`} stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
);

function spikes(cx: number, cy: number, n: number, outer: number, inner: number) {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return p.join(" ");
}

function kitten() {
  const fur = "#e9a15a";
  return (
    <>
      {animalBody(fur, <path d="M26 49 q6 5 12 0" fill="#fff" opacity=".8" />)}
      <path d="M17 28 L19 11 L30 20 Z" fill={fur} />
      <path d="M47 28 L45 11 L34 20 Z" fill={fur} />
      <path d="M19.5 24 L20.5 14.5 L27 19.5 Z" fill="#f5c9a0" />
      <path d="M44.5 24 L43.5 14.5 L37 19.5 Z" fill="#f5c9a0" />
      <ellipse cx="32" cy="32" rx="16" ry="14" fill={fur} />
      <path d="M32 18.8 v4.6 M27.6 19.8 l1 3.8 M36.4 19.8 l-1 3.8" stroke="#c97d3a" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="32" cy="38" rx="6.5" ry="4.6" fill="#fbe3c8" />
      {animalEyes(31)}
      <path d="M30.3 35.4 h3.4 l-1.7 2 Z" fill="#e0567a" />
      {smallMouth(37.4)}
      <path d="M22 36.5 h-6 M22 39 l-5.5 1.5 M42 36.5 h6 M42 39 l5.5 1.5" stroke={INK} strokeWidth=".8" opacity=".45" strokeLinecap="round" />
      {blush([22.5, 34.5], [41.5, 34.5])}
    </>
  );
}

function puppy() {
  return (
    <>
      {animalBody(
        "#c98a5a",
        <>
          <path d="M22 49.5 q10 4 20 0" stroke="#3f7cc4" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="32" cy="53" r="2" fill="#f2b134" />
        </>,
      )}
      <ellipse cx="32" cy="32" rx="14" ry="14" fill="#f1dcc0" />
      <ellipse cx="38" cy="28.5" rx="6" ry="6.5" fill="#c98a5a" />
      <ellipse cx="18.5" cy="31" rx="5.3" ry="11" transform="rotate(18 18.5 31)" fill="#8a5a3b" />
      <ellipse cx="45.5" cy="31" rx="5.3" ry="11" transform="rotate(-18 45.5 31)" fill="#8a5a3b" />
      <ellipse cx="32" cy="38.5" rx="7.5" ry="5.5" fill="#fff7ec" />
      {animalEyes(29.5, 26.5, 37.5)}
      <ellipse cx="32" cy="35.8" rx="2.8" ry="2" fill={INK} />
      <path d="M30.6 40.2 q1.4 3.4 2.8 0 Z" fill="#e0567a" />
      <path d="M32 37.8 v1.8 M32 39.6 q-2 1.8 -3.8 .6 M32 39.6 q2 1.8 3.8 .6" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {blush([24, 36], [40, 36])}
    </>
  );
}

function foxCub() {
  const fur = "#e2703a";
  const white = "#fff6ea";
  return (
    <>
      {animalBody(fur, <path d="M25 48.5 L32 60 L39 48.5 Z" fill={white} />)}
      <path d="M15 29 L16 9.5 L28 19 Z" fill={fur} />
      <path d="M49 29 L48 9.5 L36 19 Z" fill={fur} />
      <path d="M17.8 23.5 L18.4 14 L24.6 19 Z" fill="#3b2416" />
      <path d="M46.2 23.5 L45.6 14 L39.4 19 Z" fill="#3b2416" />
      <path d="M13 27 C13 20 22 17 32 17 C42 17 51 20 51 27 C51 36 42 45 32 47 C22 45 13 36 13 27 Z" fill={fur} />
      <path d="M13.4 28.5 C19 30 26 34 32 47 C22 45 14.5 37 13.4 28.5 Z" fill={white} />
      <path d="M50.6 28.5 C45 30 38 34 32 47 C42 45 49.5 37 50.6 28.5 Z" fill={white} />
      {animalEyes(29, 25.5, 38.5)}
      <ellipse cx="32" cy="44.6" rx="2.5" ry="1.9" fill={INK} />
      {blush([21, 35.5], [43, 35.5])}
    </>
  );
}

function hedgehog() {
  return (
    <>
      <polygon points={spikes(32, 33, 15, 24.5, 17)} fill="#7a5236" />
      <polygon points={spikes(32, 33, 15, 20, 14)} fill="#946747" transform="rotate(6 32 33)" />
      {animalBody("#e9cfae")}
      <circle cx="21" cy="29.5" r="3.2" fill="#e3c2a0" />
      <circle cx="43" cy="29.5" r="3.2" fill="#e3c2a0" />
      <ellipse cx="32" cy="38" rx="13" ry="11.5" fill="#f3dcc0" />
      <ellipse cx="32" cy="43" rx="5.2" ry="3.8" fill="#f8e8d4" />
      {animalEyes(36, 27, 37)}
      <circle cx="32" cy="42.2" r="2.2" fill={INK} />
      {blush([23.5, 41], [40.5, 41])}
      <circle cx="43" cy="14.5" r="3.8" fill="#e0567a" />
      <path d="M43 10.8 q1 -2 2.8 -2.2" stroke="#2f7a4f" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  );
}

function bunny() {
  const fur = "#f4f1ec";
  return (
    <>
      {animalBody("#f2b134", <path d="M26 48.6 q6 4 12 0" fill="#fff" opacity=".7" />)}
      <ellipse cx="25" cy="15" rx="4.8" ry="12.5" transform="rotate(-8 25 15)" fill={fur} />
      <ellipse cx="39" cy="15" rx="4.8" ry="12.5" transform="rotate(8 39 15)" fill={fur} />
      <ellipse cx="25" cy="15.5" rx="2.2" ry="8.6" transform="rotate(-8 25 15.5)" fill="#f2b8c6" />
      <ellipse cx="39" cy="15.5" rx="2.2" ry="8.6" transform="rotate(8 39 15.5)" fill="#f2b8c6" />
      <ellipse cx="32" cy="35" rx="13.5" ry="12.5" fill={fur} />
      {animalEyes(33, 27, 37)}
      <path d="M30.6 37 h2.8 l-1.4 1.7 Z" fill="#e0567a" />
      {smallMouth(38.7)}
      <rect x="30.8" y="40.2" width="2.4" height="2.7" rx=".6" fill="#fff" stroke="#d6d0c6" strokeWidth=".5" />
      {blush([24, 38.5], [40, 38.5])}
    </>
  );
}

function bearCub() {
  const fur = "#9a6444";
  return (
    <>
      {animalBody("#3f7cc4", <path d="M26 48.6 q6 5 12 0" fill="#fff" opacity=".8" />)}
      <circle cx="19.5" cy="20.5" r="6" fill={fur} />
      <circle cx="44.5" cy="20.5" r="6" fill={fur} />
      <circle cx="19.5" cy="20.5" r="3" fill="#c98f67" />
      <circle cx="44.5" cy="20.5" r="3" fill="#c98f67" />
      <circle cx="32" cy="33" r="15" fill={fur} />
      <ellipse cx="32" cy="39" rx="7.5" ry="6" fill="#d9b08c" />
      {animalEyes(30)}
      <ellipse cx="32" cy="36.6" rx="3" ry="2.1" fill={INK} />
      <path d="M32 38.6 v1.6 M32 40.2 q-1.8 1.6 -3.4 .5 M32 40.2 q1.8 1.6 3.4 .5" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {blush([22.5, 35.5], [41.5, 35.5])}
    </>
  );
}

function owlet() {
  const feathers = "#8e6a4f";
  return (
    <>
      <path d="M16 27 L14.5 12 L25 20 Z" fill={feathers} />
      <path d="M48 27 L49.5 12 L39 20 Z" fill={feathers} />
      <ellipse cx="32" cy="42" rx="18" ry="23" fill={feathers} />
      <ellipse cx="32" cy="51" rx="11" ry="13" fill="#e9d5b8" />
      <path d="M27 48 q2.5 2 5 0 q2.5 2 5 0 M27 53 q2.5 2 5 0 q2.5 2 5 0" stroke="#b48a66" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="24.5" cy="31" r="8" fill="#fbf5ea" />
      <circle cx="39.5" cy="31" r="8" fill="#fbf5ea" />
      {animalEyes(31.5, 25, 39, 3.4)}
      <circle cx="26.1" cy="30.3" r="1" fill="#fff" />
      <circle cx="40.1" cy="30.3" r="1" fill="#fff" />
      <path d="M29.6 36.5 L34.4 36.5 L32 41 Z" fill="#f2b134" />
    </>
  );
}

function panda() {
  return (
    <>
      {animalBody("#2f8f6f", <path d="M27 48.6 l5 5 l5 -5" fill="#fff" opacity=".85" />)}
      <circle cx="19" cy="20" r="6" fill={INK} />
      <circle cx="45" cy="20" r="6" fill={INK} />
      <circle cx="32" cy="33" r="15.5" fill="#faf8f4" />
      <ellipse cx="25.5" cy="31" rx="4.4" ry="5.8" transform="rotate(35 25.5 31)" fill={INK} />
      <ellipse cx="38.5" cy="31" rx="4.4" ry="5.8" transform="rotate(-35 38.5 31)" fill={INK} />
      <circle cx="26.2" cy="30.6" r="1.5" fill="#fff" />
      <circle cx="37.8" cy="30.6" r="1.5" fill="#fff" />
      <ellipse cx="32" cy="37" rx="2.6" ry="1.9" fill={INK} />
      {smallMouth(38.8)}
      {blush([22.5, 37.5], [41.5, 37.5])}
    </>
  );
}

function raccoon() {
  const fur = "#a7a29c";
  return (
    <>
      {animalBody("#f2b134", <path d="M26 48.6 q6 4 12 0" fill="#fff" opacity=".7" />)}
      <path d="M16 27 L18 12 L28 20 Z" fill={fur} />
      <path d="M48 27 L46 12 L36 20 Z" fill={fur} />
      <path d="M18.8 23 L19.6 15.5 L25 19.6 Z" fill="#3a3632" />
      <path d="M45.2 23 L44.4 15.5 L39 19.6 Z" fill="#3a3632" />
      <ellipse cx="32" cy="33" rx="16" ry="14" fill={fur} />
      <path d="M17 34 C17 27 24 25 32 28 C40 25 47 27 47 34 C47 41 40 45.5 32 45.5 C24 45.5 17 41 17 34 Z" fill="#f4f1ec" />
      <path d="M32 19.5 v7" stroke="#6b6660" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M17.5 31 C20 26 27 26 31 30 L32 31 L33 30 C37 26 44 26 46.5 31 C44.5 35.5 38 35.5 34 33 L32 34 L30 33 C26 35.5 19.5 35.5 17.5 31 Z"
        fill="#3a3632"
      />
      <circle cx="25.5" cy="30.8" r="2.3" fill="#fff" />
      <circle cx="38.5" cy="30.8" r="2.3" fill="#fff" />
      {animalEyes(31, 25.7, 38.3, 1.35)}
      <ellipse cx="32" cy="38.2" rx="2.6" ry="1.9" fill={INK} />
      {smallMouth(40)}
      {blush([22, 38.5], [42, 38.5])}
    </>
  );
}

function frog() {
  const skin = "#6cbf5f";
  return (
    <>
      {animalBody("#5fae5a", <ellipse cx="32" cy="58" rx="10" ry="8" fill="#d8efb8" />)}
      <circle cx="22" cy="25" r="7" fill={skin} />
      <circle cx="42" cy="25" r="7" fill={skin} />
      <ellipse cx="32" cy="36" rx="17" ry="12" fill={skin} />
      <circle cx="22" cy="25" r="4.6" fill="#fff" />
      <circle cx="42" cy="25" r="4.6" fill="#fff" />
      {animalEyes(25.5, 22.5, 41.5, 2.2)}
      <circle cx="29.5" cy="33" r=".75" fill={INK} />
      <circle cx="34.5" cy="33" r=".75" fill={INK} />
      <path d="M22 38 q10 7 20 0" stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {blush([19, 37], [45, 37])}
    </>
  );
}

function penguin() {
  return (
    <>
      <ellipse cx="32" cy="44" rx="18" ry="24" fill="#2f3a4a" />
      <path d="M20 34 C20 24 26 21 32 25 C38 21 44 24 44 34 C44 44 39 50 32 50 C25 50 20 44 20 34 Z" fill="#faf8f4" />
      {animalEyes(32, 27, 37)}
      <path d="M29 36.5 L35 36.5 L32 40 Z" fill="#f2b134" />
      {blush([24, 38], [40, 38])}
      <path d="M16 53 q16 8 32 0 l0 4.5 q-16 8 -32 0 Z" fill="#e0567a" />
    </>
  );
}

function squirrel() {
  const fur = "#c97842";
  const light = "#f3d9b8";
  return (
    <>
      <path d="M42 62 C62 58 64 34 53 24 C46 18 39 23 44 29 C51 37 48 48 39 52 Z" fill="#b8683a" />
      <path d="M47 50 C55 44 56 34 50 28" stroke="#dca070" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
      {animalBody(fur, <ellipse cx="32" cy="58" rx="8" ry="9" fill={light} />)}
      <path d="M20 25 L19 10 L28 19 Z" fill={fur} />
      <path d="M44 25 L45 10 L36 19 Z" fill={fur} />
      <path d="M21.2 21.5 L20.6 14 L25.8 19 Z" fill="#8a4f2a" opacity=".55" />
      <path d="M42.8 21.5 L43.4 14 L38.2 19 Z" fill="#8a4f2a" opacity=".55" />
      <ellipse cx="32" cy="32" rx="14" ry="13" fill={fur} />
      <ellipse cx="32" cy="37" rx="8" ry="6" fill={light} />
      {animalEyes(30, 26.5, 37.5)}
      <ellipse cx="32" cy="34.6" rx="1.7" ry="1.2" fill={INK} />
      {smallMouth(36)}
      <rect x="30.9" y="37.9" width="2.2" height="2.4" rx=".5" fill="#fff" stroke="#d6d0c6" strokeWidth=".5" />
      {blush([23.5, 35.5], [40.5, 35.5])}
    </>
  );
}

export const drawings: Record<string, Drawing> = {
  "girl-braids": { bg: "#f5dde0", draw: girlBraids },
  "girl-puffs": { bg: "#e6e0f2", draw: girlPuffs },
  "girl-bob": { bg: "#d8efe6", draw: girlBob },
  "girl-ponytail": { bg: "#f3e6cf", draw: girlPonytail },
  "boy-side": { bg: "#dbe7f3", draw: boySide },
  "boy-curls": { bg: "#f3e6cf", draw: boyCurls },
  "boy-glasses": { bg: "#dfeadf", draw: boyGlasses },
  "boy-cap": { bg: "#f5dde0", draw: boyCap },
  "woman-bun": { bg: "#d8efe6", draw: womanBun },
  "woman-long": { bg: "#f5dde0", draw: womanLong },
  "man-beard": { bg: "#f3e6cf", draw: manBeard },
  "man-glasses": { bg: "#dbe7f3", draw: manGlasses },
  kitten: { bg: "#dbe7f3", draw: kitten },
  puppy: { bg: "#f3e6cf", draw: puppy },
  "fox-cub": { bg: "#d8efe6", draw: foxCub },
  hedgehog: { bg: "#f5dde0", draw: hedgehog },
  bunny: { bg: "#e6e0f2", draw: bunny },
  "bear-cub": { bg: "#dfeadf", draw: bearCub },
  owlet: { bg: "#dbe7f3", draw: owlet },
  panda: { bg: "#d8efe6", draw: panda },
  raccoon: { bg: "#dfeadf", draw: raccoon },
  frog: { bg: "#f3e6cf", draw: frog },
  penguin: { bg: "#dbe7f3", draw: penguin },
  squirrel: { bg: "#e6e0f2", draw: squirrel },
};

export const neutral: Drawing = {
  bg: "#e4e8e1",
  draw: () => (
    <>
      <circle cx="32" cy="27" r="11" fill="#a9b3a8" />
      <path d="M11 66 C11 50 20 43 32 43 C44 43 53 50 53 66 Z" fill="#a9b3a8" />
    </>
  ),
};

function starPoints(x: number, y: number) {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 1.5 : 3.6;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    p.push(`${(x + r * Math.cos(a)).toFixed(2)},${(y + r * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(" ");
}

const STARS = Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return starPoints(36 + 33.4 * Math.cos(a), 36 + 33.4 * Math.sin(a));
});

export const frameDrawings: Record<string, () => ReactNode> = {
  none: () => null,
  forest: () => <circle className="picture-frame-forest" cx="36" cy="36" r="33.5" fill="none" strokeWidth="3.2" />,
  sea: () => (
    <g className="picture-frame-sea" fill="none" strokeWidth="1.6">
      <circle cx="36" cy="36" r="34.3" />
      <circle cx="36" cy="36" r="31.4" />
    </g>
  ),
  sun: () => <circle className="picture-frame-sun" cx="36" cy="36" r="33.4" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="0.01 5.25" />,
  berry: () => <circle className="picture-frame-berry" cx="36" cy="36" r="33.4" fill="none" strokeWidth="3" strokeDasharray="7 4" strokeLinecap="round" />,
  stars: () => (
    <g className="picture-frame-stars">
      <circle cx="36" cy="36" r="33.4" fill="none" strokeWidth="1.4" />
      {STARS.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </g>
  ),
};
