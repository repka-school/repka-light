/** Illustrated in the same side-on style as the homestead's cat and dog. */
export function Livestock({ kind }: { kind: "cow" | "chicken" }) {
  if (kind === "chicken") return <g transform="translate(0 26)">
    <ellipse rx="10" ry="3" className="p-shadow" />
    <path d="M-3-6v6l3 1m3-7v6l3 1" stroke="#b7833f" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    <g className="hen-body">
      <path d="M-7-7q-6-2-8-11 4 0 7 4-1-4 0-6 4 3 5 7Z" fill="#956448" />
      <path d="M-10-11q2-5 8-4 5 1 7-5 2-4 6-2 5 3 1 8-1 10-10 11-10 1-12-8Z" fill="#f3d3a2" />
      <path d="M-8-11q4-4 11-1-1 7-8 5Z" fill="#c58b55" />
      <path d="m11-18 5 2-5 2" fill="#d79a39" /><path d="M3-21q-2-5 1-5l2 2q2-6 4 0 3-2 2 3Z" fill="#c85545" />
      <circle cx="9" cy="-19" r="1.1" className="p-ink" />
    </g>
  </g>;
  return <g transform="translate(0 26)">
    <ellipse cx="1" rx="27" ry="6" className="p-shadow" />
    <path d="M-13-14v13m26-14v14" stroke="#ab9e8b" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M-20-25q-6 3-5 16l-2 4" fill="none" stroke="#85776b" strokeWidth="2" />
    <path d="M-26-8q-4 1-3 5 4 2 5-3Z" fill="#433f39" />
    <path d="M-20-22q-1-8 7-10 11-2 23 0 10-1 13 8 3 14-9 15-11 1-23-1-11 2-11-12Z" fill="#f7efdd" />
    <path d="M-17-30q5-4 14-3 1 5-2 8-2 3-6 2-6-1-6-7Zm25 3q6-3 10 2 4 5-2 9-4 2-8-1-4-5 0-10Z" fill="#4c4941" />
    <path d="M-14-12v12m27-11v11" stroke="#e5d9c2" strokeWidth="5" strokeLinecap="round" />
    <path d="M-16 0h4m23 0h4" stroke="#514940" strokeWidth="3" strokeLinecap="round" />
    <g className="cow-head">
      <path d="M21-34q-4-3-3-7 4 1 5 6m4 1q4-3 4-6 2 4-1 7" fill="#d0b887" />
      <path d="M20-34q-7-5-10-1 3 6 10 5m6-4q5-4 10-2-1 6-9 6" fill="#555046" />
      <path d="M18-33q5-6 12-1 4 3 3 10-1 6-7 8-7-1-9-8-2-6 1-9Z" fill="#fbf2df" />
      <ellipse cx="29" cy="-21" rx="7.2" ry="4.5" fill="#d99f91" />
      <circle cx="26" cy="-29" r="1.5" className="p-ink" /><circle cx="32" cy="-22" r=".9" fill="#986758" />
    </g>
  </g>;
}
