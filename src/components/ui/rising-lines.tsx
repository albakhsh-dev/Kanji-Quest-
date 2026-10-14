import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface RisingLinesProps {
  /** Colors for lines, glow, and sparks. Default: ["#8B5CF6", "#FF9FFC"] */
  colors?: string[];
  /** Background color behind the canvas. Default: "transparent" */
  backgroundColor?: string;
  /** Number of rising light lines. Default: 50 */
  density?: number;
  /** Movement speed multiplier. Default: 1 */
  speed?: number;
  /** Base stroke width of lines in pixels. Default: 2 */
  lineWidth?: number;
  /** Base length of the fading tails in pixels. Default: 140 */
  lineLength?: number;
  /** Vertical placement of the glowing horizon from 0 (top) to 1 (bottom). Default: 0.92 */
  horizonHeight?: number;
  /** Horizon glow intensity multiplier. Default: 0.8 */
  horizonGlow?: number;
  /** Depth haze and perspective scaling. Default: true */
  depth?: boolean;
  /** Updraft intensity on hover. Default: 1 */
  updraft?: number;
  /** Number of rising floating sparks/embers. Default: 35 */
  particles?: number;
  /** Enable mouse hover updraft and interaction. Default: true */
  interactive?: boolean;
  /** Launch a burst volley of rising lines on click/tap. Default: true */
  clickLaunch?: boolean;
  /** Freeze animation. Respects prefers-reduced-motion automatically. Default: false */
  paused?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

export interface RisingLinesHandle {
  /** Launch a burst volley of rising lines at a given horizontal coordinate */
  launch: (x?: number, strength?: number) => void;
  /** Reset and replay the line distribution */
  replay: () => void;
}

interface Line {
  x: number;
  baseX: number;
  y: number;
  speed: number;
  baseSpeed: number;
  width: number;
  length: number;
  maxOpacity: number;
  opacity: number;
  colorSet: [string, string, string];
  layer: number;
  phase: number;
  swaySpeed: number;
  swayAmp: number;
  isVolley: boolean;
}

interface Spark {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export const RisingLines = forwardRef<RisingLinesHandle, RisingLinesProps>(({
  colors = ['#8B5CF6', '#FF9FFC', '#38BDF8', '#FF4E50'],
  backgroundColor = 'transparent',
  density = 50,
  speed = 1.0,
  lineWidth = 2.0,
  lineLength = 140,
  horizonHeight = 0.92,
  horizonGlow = 0.8,
  depth = true,
  updraft = 1.0,
  particles = 35,
  interactive = true,
  clickLaunch = true,
  paused = false,
  className = '',
  style,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<{
    lines: Line[];
    sparks: Spark[];
    width: number;
    height: number;
    dpr: number;
    pointer: { x: number; y: number; vx: number; vy: number; active: boolean; lastSeen: number };
    animId: number | null;
    lastTime: number;
  }>({
    lines: [],
    sparks: [],
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: -9999, y: -9999, vx: 0, vy: 0, active: false, lastSeen: 0 },
    animId: null,
    lastTime: performance.now(),
  });

  // Convert array of colors to gradient triplets [bright, mid, transparent]
  const colorSets = React.useMemo(() => {
    return colors.map((col, idx) => {
      const nextCol = colors[(idx + 1) % colors.length];
      return [col, nextCol, 'rgba(0,0,0,0)'] as [string, string, string];
    });
  }, [colors]);

  const createLine = React.useCallback((scatterInitial = false): Line => {
    const engine = engineRef.current;
    const horizonY = engine.height * horizonHeight;
    const layer = depth ? Math.random() : 0.5;

    let spd = speed;
    let w = lineWidth;
    let len = lineLength;
    let maxOp = 0.85;

    if (depth) {
      if (layer < 0.35) {
        spd = speed * (0.6 + Math.random() * 0.5);
        w = lineWidth * 0.65;
        len = lineLength * 0.7;
        maxOp = 0.45;
      } else if (layer < 0.75) {
        spd = speed * (1.0 + Math.random() * 0.8);
        w = lineWidth * 0.95;
        len = lineLength * 1.0;
        maxOp = 0.75;
      } else {
        spd = speed * (1.6 + Math.random() * 1.2);
        w = lineWidth * 1.35;
        len = lineLength * 1.3;
        maxOp = 0.95;
      }
    }

    const colorSet = colorSets[Math.floor(Math.random() * colorSets.length)];
    const x = Math.random() * (engine.width || 800);
    const y = scatterInitial
      ? horizonY - Math.random() * (horizonY + len)
      : horizonY + Math.random() * 20;

    return {
      x,
      baseX: x,
      y,
      speed: spd,
      baseSpeed: spd,
      width: w,
      length: len,
      maxOpacity: maxOp,
      opacity: scatterInitial ? maxOp : 0,
      colorSet,
      layer,
      phase: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      swayAmp: 1.0 + Math.random() * 2.0,
      isVolley: false,
    };
  }, [horizonHeight, depth, speed, lineWidth, lineLength, colorSets]);

  const createSpark = React.useCallback((scatterInitial = false): Spark => {
    const engine = engineRef.current;
    const horizonY = engine.height * horizonHeight;
    const x = Math.random() * (engine.width || 800);
    const y = scatterInitial
      ? horizonY - Math.random() * horizonY
      : horizonY + Math.random() * 20;

    const col = colors[Math.floor(Math.random() * colors.length)];

    return {
      x,
      y,
      radius: 1.0 + Math.random() * 1.8,
      speedY: (0.8 + Math.random() * 1.4) * speed,
      speedX: (Math.random() - 0.5) * 0.6,
      color: col,
      opacity: 0.3 + Math.random() * 0.7,
      pulseSpeed: 0.03 + Math.random() * 0.05,
      pulsePhase: Math.random() * Math.PI * 2,
    };
  }, [horizonHeight, colors, speed]);

  const populate = React.useCallback(() => {
    const engine = engineRef.current;
    engine.lines = [];
    engine.sparks = [];

    for (let i = 0; i < density; i++) {
      engine.lines.push(createLine(true));
    }
    for (let i = 0; i < particles; i++) {
      engine.sparks.push(createSpark(true));
    }
  }, [density, particles, createLine, createSpark]);

  const launchVolley = React.useCallback((targetX?: number, strength = 1.0) => {
    const engine = engineRef.current;
    const horizonY = engine.height * horizonHeight;
    const count = Math.floor(20 * strength);
    const originX = targetX ?? engine.width / 2;

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 280 * strength;
      const lx = Math.max(10, Math.min(engine.width - 10, originX + spread));
      const colorSet = colorSets[Math.floor(Math.random() * colorSets.length)];

      engine.lines.push({
        x: lx,
        baseX: lx,
        y: horizonY + Math.random() * 20,
        speed: (3.5 + Math.random() * 4.0) * strength * speed,
        baseSpeed: 3.5 * speed,
        width: lineWidth * (1.1 + Math.random() * 1.1),
        length: lineLength * (1.2 + Math.random() * 1.5),
        maxOpacity: 0.98,
        opacity: 0.98,
        colorSet,
        layer: 2,
        phase: Math.random() * Math.PI * 2,
        swaySpeed: 0.02,
        swayAmp: 1.0,
        isVolley: true,
      });
    }

    for (let s = 0; s < 14; s++) {
      const spSpread = (Math.random() - 0.5) * 220 * strength;
      engine.sparks.push({
        x: Math.max(10, Math.min(engine.width - 10, originX + spSpread)),
        y: horizonY + Math.random() * 20,
        radius: 1.4 + Math.random() * 2.0,
        speedY: (1.8 + Math.random() * 2.5) * strength * speed,
        speedX: (Math.random() - 0.5) * 1.5,
        color: '#ffffff',
        opacity: 1.0,
        pulseSpeed: 0.05,
        pulsePhase: Math.random() * Math.PI,
      });
    }
  }, [horizonHeight, colorSets, speed, lineWidth, lineLength]);

  useImperativeHandle(ref, () => ({
    launch: (x, str) => launchVolley(x, str),
    replay: () => populate(),
  }), [launchVolley, populate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      engineRef.current.width = w;
      engineRef.current.height = h;
      engineRef.current.dpr = dpr;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    populate();

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Pointer events
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const clientY = 'clientY' in e ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      if (clientX === null || clientY === null) return;

      const rect = canvas.getBoundingClientRect();
      const pointer = engineRef.current.pointer;
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      if (pointer.x > -1000) {
        pointer.vx = px - pointer.x;
        pointer.vy = py - pointer.y;
      }
      pointer.x = px;
      pointer.y = py;
      pointer.active = true;
      pointer.lastSeen = performance.now();
    };

    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (!clickLaunch) return;
      const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      if (clientX === null) return;
      const rect = canvas.getBoundingClientRect();
      launchVolley(clientX - rect.left, 1.0);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });

    // Render loop
    let running = true;
    const render = (timestamp: number) => {
      if (!running) return;

      const engine = engineRef.current;
      const elapsed = timestamp - engine.lastTime;
      engine.lastTime = timestamp;
      const deltaFactor = Math.min(elapsed / 16.67, 3.0);

      const w = engine.width;
      const h = engine.height;
      const horizonY = h * horizonHeight;
      const pointer = engine.pointer;
      const pointerActive = interactive && pointer.active && (timestamp - pointer.lastSeen < 2200);

      pointer.vx *= 0.92;
      pointer.vy *= 0.92;

      // Update lines
      for (let i = engine.lines.length - 1; i >= 0; i--) {
        const line = engine.lines[i];
        let curSpd = line.speed;
        let lateralPull = 0;

        if (pointerActive) {
          const dx = line.x - pointer.x;
          const dist = Math.abs(dx);
          const updraftRadius = 240;
          if (dist < updraftRadius) {
            const factor = Math.pow(1 - dist / updraftRadius, 1.5);
            curSpd += line.baseSpeed * 2.2 * factor * updraft;
            lateralPull = Math.sign(dx) * -0.7 * factor;
          }
        }

        line.y -= curSpd * deltaFactor;
        line.phase += line.swaySpeed * deltaFactor;
        line.x = line.baseX + Math.sin(line.phase) * line.swayAmp + lateralPull;

        if (line.y > horizonY - 100) {
          const dist = horizonY - line.y;
          line.opacity = Math.min(line.maxOpacity, Math.max(0, dist / 70) * line.maxOpacity);
        } else if (line.y < 140) {
          line.opacity = Math.max(0, (line.y / 140) * line.maxOpacity);
        } else {
          line.opacity = line.maxOpacity;
        }

        if (line.y + line.length < -40 || (line.opacity <= 0.01 && line.y < 60)) {
          if (line.isVolley) {
            engine.lines.splice(i, 1);
          } else {
            Object.assign(line, createLine(false));
          }
        }
      }

      // Update sparks
      for (let s = engine.sparks.length - 1; s >= 0; s--) {
        const sp = engine.sparks[s];
        sp.y -= sp.speedY * deltaFactor;
        sp.x += sp.speedX * deltaFactor;
        sp.pulsePhase += sp.pulseSpeed * deltaFactor;

        if (sp.y < -20) {
          if (engine.sparks.length > particles) {
            engine.sparks.splice(s, 1);
          } else {
            Object.assign(sp, createSpark(false));
          }
        }
      }

      // Draw
      ctx.clearRect(0, 0, w, h);

      // Horizon Glow
      if (horizonGlow > 0) {
        ctx.save();
        const primaryColor = colors[0] || '#8B5CF6';
        const secondaryColor = colors[1] || '#FF9FFC';

        const broadHalo = ctx.createRadialGradient(
          w * 0.5, horizonY + 60, 30,
          w * 0.5, horizonY + 20, Math.max(w * 0.7, 500)
        );
        broadHalo.addColorStop(0.0, primaryColor + '66');
        broadHalo.addColorStop(0.5, secondaryColor + '26');
        broadHalo.addColorStop(1.0, 'rgba(0,0,0,0)');

        ctx.fillStyle = broadHalo;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, horizonY + 30, w * 0.8, 180, 0, 0, Math.PI * 2);
        ctx.fill();

        const coreHalo = ctx.createRadialGradient(
          w * 0.5, horizonY, 5,
          w * 0.5, horizonY, Math.min(w * 0.5, 400)
        );
        coreHalo.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
        coreHalo.addColorStop(0.25, primaryColor + '88');
        coreHalo.addColorStop(1.0, 'rgba(0,0,0,0)');

        ctx.fillStyle = coreHalo;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, horizonY, w * 0.55, 50, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Lines
      const sorted = [...engine.lines].sort((a, b) => a.layer - b.layer);
      for (let i = 0; i < sorted.length; i++) {
        const line = sorted[i];
        if (line.opacity <= 0.01) continue;

        const hx = line.x;
        const hy = line.y;
        const ty = line.y + line.length;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, line.opacity));

        const grad = ctx.createLinearGradient(hx, hy, hx, ty);
        grad.addColorStop(0.0, '#ffffff');
        grad.addColorStop(0.12, line.colorSet[0]);
        grad.addColorStop(0.50, line.colorSet[1]);
        grad.addColorStop(1.0, 'rgba(0,0,0,0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = line.width;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(hx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        const glowR = line.width * 2.5;
        const hGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, glowR);
        hGlow.addColorStop(0.0, '#ffffff');
        hGlow.addColorStop(0.4, line.colorSet[0]);
        hGlow.addColorStop(1.0, 'rgba(0,0,0,0)');

        ctx.fillStyle = hGlow;
        ctx.beginPath();
        ctx.arc(hx, hy, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Sparks
      ctx.save();
      for (let s = 0; s < engine.sparks.length; s++) {
        const sp = engine.sparks[s];
        const pulse = 0.6 + 0.4 * Math.sin(sp.pulsePhase);
        ctx.globalAlpha = Math.max(0, Math.min(1, sp.opacity * pulse));
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (!paused) {
        engine.animId = requestAnimationFrame(render);
      }
    };

    if (!paused) {
      engineRef.current.animId = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      if (engineRef.current.animId) {
        cancelAnimationFrame(engineRef.current.animId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('click', handleClick);
    };
  }, [populate, createLine, createSpark, launchVolley, interactive, clickLaunch, paused, horizonHeight, horizonGlow, updraft, colors, density, particles]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      style={{ backgroundColor, ...style }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

RisingLines.displayName = 'RisingLines';

export default RisingLines;
