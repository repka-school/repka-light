import { useEffect, useRef } from "react";

export function Duck({ young = false }: { young?: boolean }) {
  return <g>
    <path d="M-15-6q3 2 7 2 9-5 15-2 6 3 3 7-6 5-15 2-8-2-10-9Z" fill={young ? "#f2c657" : "#c5bca2"} />
    <path d="M-11-4q5-3 13-1-3 6-10 4Z" fill={young ? "#dfa844" : "#968b75"} />
    {!young && <path d="M-9-2q3 1 7-1" fill="none" stroke="#515f86" strokeWidth="1.8" strokeLinecap="round" />}
    <path d="M4-3q2-3 1-7l7-1q0 7-2 10Z" fill={young ? "#f9cc62" : "#89593e"} />
    <circle cx="8" cy="-11" r="5.7" fill={young ? "#ffda75" : "#39735e"} />
    {!young && <path d="M4.8-6.3q3 1.7 6.7.2" fill="none" stroke="#f6ecd4" strokeWidth="1.5" strokeLinecap="round" />}
    <path d="M12-11q2 .8 6 1 .8 2-6 2Z" fill={young ? "#dcaa43" : "#e6b64d"} />
    <circle cx="10.4" cy="-12" r="1" fill="#34362b" />
  </g>;
}

const swimStart = 1.4;
const duckSizes = [1, .68, .57];

function swimPose(time: number, index: number, size: number) {
  const phase = time * 2 * Math.PI / 22 - index * .54;
  const x = 46 * Math.sin(phase);
  const y = 72 - 13 * Math.cos(phase) + 2 * Math.sin(2 * phase);
  const dx = 46 * Math.cos(phase);
  const dy = 13 * Math.sin(phase) + 4 * Math.cos(2 * phase);
  const facing = dx < 0 ? -1 : 1;
  const side = .55 + .45 * Math.abs(Math.cos(Math.atan2(dy / .46, dx)));
  const bob = .55 * Math.sin(time * 3.1 - index);
  const wakeAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  return {
    bird: `translate(${x} ${y + bob}) scale(${size * facing * side} ${size})`,
    wake: `translate(${x} ${y}) rotate(${wakeAngle}) scale(${size})`,
  };
}

export function PondSwimmers() {
  const root = useRef<SVGGElement>(null);
  useEffect(() => {
    const el = root.current!;
    const ducks = el.querySelectorAll(".pond-bird");
    const wakes = el.querySelectorAll(".pond-wake");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, last = 0, time = swimStart;
    function draw() {
      duckSizes.forEach((size, index) => {
        const pose = swimPose(time, index, size);
        ducks[index].setAttribute("transform", pose.bird);
        wakes[index].setAttribute("transform", pose.wake);
      });
    }
    function tick(now: number) {
      if (!last || now - last >= 1000 / 30 - 1) {
        time += last ? Math.min(.1, (now - last) / 1000) : 0;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame);
      last = 0;
      if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    }
    resume();
    motion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return <g className="pond-swimmers" ref={root}>
    {duckSizes.map((size, index) => {
      const pose = swimPose(swimStart, index, size);
      return <g key={size}>
        <g className="pond-wake" transform={pose.wake} fill="none" stroke="#d4ece0" strokeWidth="1.15" strokeLinecap="round">
          <path d="M-3-4q-6-1-13-4m12 12q-7 1-15 0m-1-8-5-2" />
        </g>
        <g className="pond-bird" transform={pose.bird}><Duck young={index !== 0} /></g>
      </g>;
    })}
  </g>;
}
