import { useEffect, useRef } from 'react';

// Brand palette: blue, indigo, violet, mint, sky.
const PALETTE: Array<[number, number, number]> = [
  [59, 130, 246],
  [99, 102, 241],
  [139, 92, 246],
  [16, 185, 129],
  [14, 165, 233],
];

const TILE = 56;
const GAP = 10;
const RADIUS = 10;
const REACH = 190; // px around the pointer that lights up

/**
 * Grid of rounded tiles that light up around the mouse pointer.
 * Canvas-based so hundreds of tiles stay cheap; idles when nothing changes.
 */
export function TileBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tiles: Array<{ x: number; y: number; color: [number, number, number]; glow: number }> = [];
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let dpr = 1;

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const step = TILE + GAP;
      const cols = Math.ceil(w / step) + 1;
      const rows = Math.ceil(h / step) + 1;
      const offsetX = (w - cols * step + GAP) / 2;
      const offsetY = (h - rows * step + GAP) / 2;
      tiles = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          tiles.push({
            x: offsetX + c * step,
            y: offsetY + r * step,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            glow: 0,
          });
        }
      }
      draw();
    };

    const draw = () => {
      const dark = document.documentElement.classList.contains('dark');
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let active = false;
      for (const tile of tiles) {
        let target = 0;
        if (pointer) {
          const dx = tile.x + TILE / 2 - pointer.x;
          const dy = tile.y + TILE / 2 - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          target = Math.max(0, 1 - dist / REACH);
          target *= target;
        }
        const next = reduceMotion ? target : tile.glow + (target - tile.glow) * 0.14;
        tile.glow = Math.abs(next - target) < 0.002 ? target : next;
        if (tile.glow !== target) active = true;

        const [r, g, b] = tile.color;
        const base = dark ? 0.07 : 0.06;
        const peak = dark ? 0.75 : 0.72;
        const alpha = base + tile.glow * (peak - base);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(tile.x, tile.y, TILE, TILE, RADIUS);
        ctx.fill();
      }
      return active;
    };

    const tick = () => {
      frame = draw() ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      wake();
    };
    const onLeave = () => {
      pointer = null;
      wake();
    };

    // Redraw when the theme class on <html> changes.
    const themeObserver = new MutationObserver(() => wake());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    layout();
    window.addEventListener('resize', layout);
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener('resize', layout);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0" />;
}
