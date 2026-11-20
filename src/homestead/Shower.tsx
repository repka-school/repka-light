import { useLayoutEffect, useRef } from "react";
import { scatter } from "./iso";
import { showerStrength } from "./weather";

function makeDrops(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const depth = scatter(i, seed);
    return {
      depth,
      speed: 230 + depth * 380,
      length: 5 + depth * depth * 14,
      phase: scatter(i, seed + 1),
      threshold: scatter(i, seed + 2) * .88,
    };
  });
}

export function Shower({ start, end }: { start: number; end: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current!;
    const viewport = canvas.parentElement!;
    const ctx = canvas.getContext("2d");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const contrast = matchMedia("(forced-colors: active)");
    let width = 0, height = 0;
    let drops: ReturnType<typeof makeDrops> = [];
    let frame = 0, timer = 0;
    let lastStrength = -1;

    function draw(seconds: number, strength: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.strokeStyle = "#eef8ff";
      const wind = .16 + .07 * Math.sin(seconds * .74) + .035 * Math.sin(seconds * 1.83);
      for (const [i, drop] of drops.entries()) {
        const travel = height + drop.length * 2;
        const cycle = seconds * drop.speed / travel + drop.phase;
        const pass = Math.floor(cycle);
        const y = (cycle - pass) * travel - drop.length;
        const slant = wind + .07 * drop.depth;
        // Each pass starts somewhere new. A slowly drifting band leaves pockets of lighter rain.
        const x = scatter(i + start, pass) * (width + travel * .34) - y * slant;
        const band = .82 + .18 * Math.sin(x / 122 + seconds * .9);
        const presence = Math.min(1, Math.max(0, (strength * band - drop.threshold) * 6));
        if (!presence || x < -drop.length || x > width) continue;
        ctx.globalAlpha = presence * (.23 + drop.depth * .48);
        ctx.lineWidth = .65 + drop.depth * .9;
        ctx.beginPath();
        ctx.moveTo(x + drop.length * slant, y - drop.length);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    function paint() {
      if (document.hidden || contrast.matches) return;
      const now = Date.now();
      const strength = showerStrength(now, start, end);
      const shade = Math.round(strength * 100) / 100;
      if (shade !== lastStrength) viewport.style.setProperty("--shower", String(shade));
      if (!reduced.matches || shade !== lastStrength) {
        draw(reduced.matches ? 0 : (now - start) / 1000, strength);
      }
      lastStrength = shade;
      if (now >= end) return;
      if (reduced.matches) timer = window.setTimeout(paint, 150);
      else frame = requestAnimationFrame(paint);
    }

    function refresh() {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      drops = makeDrops(Math.min(300, Math.ceil(width * height / 2000)), start);
      lastStrength = -1;
      paint();
    }
    const observer = new ResizeObserver(refresh);
    observer.observe(viewport);
    reduced.addEventListener("change", refresh);
    contrast.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      reduced.removeEventListener("change", refresh);
      contrast.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
      viewport.style.removeProperty("--shower");
    };
  }, [start, end]);
  return <canvas ref={ref} className="homestead-rain" aria-hidden="true" />;
}
