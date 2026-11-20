import { Duck, PondSwimmers } from "./PondSwimmers";

function Reeds({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} strokeLinecap="round">
      <path d="M-2 0q-2-10-7-14M0 0l2-22M3 0q2-10 8-14" fill="none" stroke="#597d43" strokeWidth="2.4" />
      <path d="m2-21 1-6m-11 15-3-5" stroke="#926848" strokeWidth="4" />
    </g>
  );
}

export function Pond({ animate }: { animate: boolean }) {
  const shore = "M-110 65C-102 49-76 49-57 43S-33 18-6 18C21 15 29 36 53 39S99 46 108 62C122 84 88 91 68 96S31 122 3 125C-25 127-39 109-58 105S-126 85-110 65Z";
  return (
    <>
      <path d={shore} fill="#99ad6e" stroke="#a6bc79" strokeWidth="7" strokeLinejoin="round" />
      <path d={shore} transform="translate(0 4) scale(.956 .925)" fill="#69aeb1" stroke="#d7c592" strokeWidth="4" />
      <path d="M-88 68q8-14 37-16c23-3 26-23 49-22 20 0 26 17 54 20s43 11 44 18c3 17-31 16-51 27-23 13-39 24-62 14-18-8-17-14-45-18-17-3-32-12-26-23Z" fill="url(#homestead-water)" />
      <g fill="none" stroke="#c4e7d8" strokeLinecap="round" strokeWidth="1.8" opacity=".76">
        <path d="M-80 69q8-4 18-2m45-24q9-2 15-1m64 24q9 2 16-1m-82 38q13 3 25-1" />
      </g>
      <g fill="#94bb76" stroke="#669567" strokeWidth="1">
        <path d="M-62 80a9 4 0 1 1 2 2l5-3Z" />
        <path d="M-47 85a6 3 0 1 1 1 1l4-2Z" />
      </g>
      <Reeds x={-67} y={48} />
      <Reeds x={64} y={42} />
      {animate ? <PondSwimmers /> : <>
        <g transform="translate(22 61)"><Duck /></g>
        <g transform="translate(-16 73) scale(.72)"><Duck young /></g>
        <g transform="translate(-34 83) scale(.58)"><Duck young /></g>
      </>}
      <g fill="#aaa693" stroke="#8a9077" strokeWidth="1.2">
        <ellipse cx="62" cy="102" rx="9" ry="4.8" /><ellipse cx="73" cy="99" rx="5.5" ry="3.2" />
      </g>
      <Reeds x={-35} y={116} />
    </>
  );
}
