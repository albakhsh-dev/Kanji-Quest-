import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

export interface ChromeOrbitProps {
  /** The two coloured gel lights the chrome reflects, next to the white studio softboxes. Default: ["#7B5CFF", "#FF7AD9"] */
  colors?: [string, string];
  /** The room the chrome reflects: a dark studio for dark pages, a pale one for light pages. Default: "dark" */
  studio?: 'dark' | 'light';
  /** Number of nested rings, from 1 to 9. Each ring turns inside the one around it, like the gimbals of a gyroscope. Default: 4 */
  rings?: number;
  /** Diameter of the outer ring as a fraction of the frame's shorter side. Values above 1 crop the rings at the edges. Default: 0.8 */
  size?: number;
  /** Gap between nested rings as a fraction of the outer radius. Default: 0.09 */
  spacing?: number;
  /** Width of each band as a fraction of the outer radius. Default: 0.085 */
  bandWidth?: number;
  /** Thickness of each band as a fraction of the outer radius. Default: 0.018 */
  bandThickness?: number;
  /** Surface roughness, from 0 (mirror) to 0.6 (satin). Default: 0.16 */
  roughness?: number;
  /** Thin-film rainbow sheen along the band edges, from 0 to 1. Default: 0.25 */
  iridescence?: number;
  /** Speed of the rings turning and of the whole assembly drifting. Default: 1 */
  speed?: number;
  /** Forward tilt of the assembly in degrees. Default: 18 */
  tilt?: number;
  /** Speed of the studio slowly turning around the rings, which keeps the reflections gliding even when the rings are still. Default: 1 */
  lightDrift?: number;
  /** Horizontal position of the rings, from -1 (left edge) to 1 (right edge). Default: 0 */
  offsetX?: number;
  /** Vertical position of the rings, from -1 (bottom) to 1 (top). Default: 0 */
  offsetY?: number;
  /** Respond to the pointer. Default: true */
  interactive?: boolean;
  /** How far the assembly turns toward the pointer, from 0 to 2. Default: 1 */
  parallax?: number;
  /** Clicking or tapping swings every ring into one plane, a tilted halo of concentric bands. Clicking again, or waiting alignHold seconds, lets them unfold. Default: true */
  clickAlign?: boolean;
  /** Seconds the halo holds before unfolding on its own. 0 keeps it until the next click. Default: 2.5 */
  alignHold?: number;
  /** Tilt of the aligned halo in degrees, from 0 (facing you) to 85 (nearly edge-on). Default: 62 */
  haloTilt?: number;
  /** The rings arrive as a halo and unfold into the gyroscope. Default: true */
  intro?: boolean;
  /** Freeze the rings. Reduced-motion users always get a still gyroscope, without the intro. Default: false */
  paused?: boolean;
  /** Resolution scale from 0.25 to 1. Default: 1 */
  quality?: number;
  /** Content placed over the rings. */
  children?: React.ReactNode;
  /** Classes for the root element. It fills its parent, with a 240px minimum height. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
}

export interface ChromeOrbitHandle {
  align: () => void;
  release: () => void;
  replay: () => void;
}

// Helper: parse hex color string to RGB tuple
function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [180, 190, 210];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// 3D Vector Math Helpers
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function rotateX(v: Vec3, rad: number): Vec3 {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x,
    y: v.y * cos - v.z * sin,
    z: v.y * sin + v.z * cos,
  };
}

function rotateY(v: Vec3, rad: number): Vec3 {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  };
}

function rotateZ(v: Vec3, rad: number): Vec3 {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
    z: v.z,
  };
}

// Apply composite Euler rotations (Yaw Z -> Pitch X -> Roll Y)
function rotateEuler(v: Vec3, ax: number, ay: number, az: number): Vec3 {
  let r = rotateZ(v, az);
  r = rotateX(r, ax);
  r = rotateY(r, ay);
  return r;
}

// Hermite smoothstep interpolation
function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

// Renderable Polygon Segment for Painter's Algorithm Depth Sorting
interface PolySegment {
  avgZ: number;
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
  color: string;
}

export const ChromeOrbit = forwardRef<ChromeOrbitHandle, ChromeOrbitProps>(({
  colors = ['#7B5CFF', '#FF7AD9'],
  studio = 'dark',
  rings = 4,
  size = 0.8,
  spacing = 0.09,
  bandWidth = 0.085,
  bandThickness = 0.018,
  roughness = 0.16,
  iridescence = 0.25,
  speed = 1,
  tilt = 18,
  lightDrift = 1,
  offsetX = 0,
  offsetY = 0,
  interactive = true,
  parallax = 1,
  clickAlign = true,
  alignHold = 2.5,
  haloTilt = 62,
  intro = true,
  paused = false,
  quality = 1,
  children,
  className = '',
  style,
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Alignment state: 0 (gyroscope) to 1 (flat halo)
  const alignProgressRef = useRef<number>(intro ? 1.0 : 0.0);
  const targetAlignRef = useRef<number>(intro ? 1.0 : 0.0);
  const holdTimerRef = useRef<number | null>(null);

  // Mouse interaction state with smooth damping
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  // Track if user prefers reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle intro release after brief initial showcase
  useEffect(() => {
    if (intro && !prefersReducedMotion && !paused) {
      targetAlignRef.current = 1.0;
      alignProgressRef.current = 1.0;
      const introTimer = window.setTimeout(() => {
        targetAlignRef.current = 0.0;
      }, 500);
      return () => clearTimeout(introTimer);
    }
  }, [intro, prefersReducedMotion, paused]);

  // Imperative handle functions
  useImperativeHandle(ref, () => ({
    align: () => {
      targetAlignRef.current = 1.0;
    },
    release: () => {
      targetAlignRef.current = 0.0;
    },
    replay: () => {
      alignProgressRef.current = 1.0;
      targetAlignRef.current = 1.0;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => {
        targetAlignRef.current = 0.0;
      }, 500);
    },
  }));

  // Click handler to toggle or swing into halo
  const handleContainerClick = () => {
    if (!clickAlign) return;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (targetAlignRef.current > 0.5) {
      // Unfold back to gyroscope
      targetAlignRef.current = 0.0;
    } else {
      // Align into halo
      targetAlignRef.current = 1.0;
      if (alignHold > 0) {
        holdTimerRef.current = window.setTimeout(() => {
          targetAlignRef.current = 0.0;
        }, alignHold * 1000);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const gel1Rgb = hexToRgb(colors[0] || '#7B5CFF');
    const gel2Rgb = hexToRgb(colors[1] || '#FF7AD9');

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2) * Math.max(0.25, Math.min(1, quality));
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    intersectionObserver.observe(canvas);

    // Mouse movement tracker with normalization
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = Math.max(-1, Math.min(1, nx)) * 14 * parallax;
      mouseRef.current.targetY = Math.max(-1, Math.min(1, ny)) * 12 * parallax;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }

    const startTime = performance.now();
    const clampedRings = Math.max(1, Math.min(9, rings));

    // Axis parameters for each gimbal ring
    const ringAxes = [
      { speedX: 0.28, speedY: 0.85, speedZ: 0.15, phase: 0.0 },
      { speedX: 0.72, speedY: -0.55, speedZ: 0.35, phase: 1.2 },
      { speedX: -0.48, speedY: 0.65, speedZ: -0.58, phase: 2.5 },
      { speedX: 0.62, speedY: 0.42, speedZ: 0.75, phase: 3.8 },
      { speedX: -0.35, speedY: -0.68, speedZ: 0.22, phase: 4.7 },
      { speedX: 0.54, speedY: 0.58, speedZ: -0.42, phase: 5.4 },
      { speedX: -0.62, speedY: 0.38, speedZ: 0.52, phase: 0.8 },
      { speedX: 0.45, speedY: -0.48, speedZ: -0.35, phase: 2.1 },
      { speedX: -0.52, speedY: 0.52, speedZ: 0.48, phase: 3.4 },
    ];

    const render = (time: number) => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }
      const isStill = paused || prefersReducedMotion;
      const elapsed = isStill ? 0 : (time - startTime) * 0.001 * speed;

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      // Smooth alignment transition (spring/ease)
      const alignDiff = targetAlignRef.current - alignProgressRef.current;
      alignProgressRef.current += alignDiff * 0.065;
      const alignFactor = smoothstep(0, 1, alignProgressRef.current);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + offsetX * (width * 0.25);
      const cy = height / 2 - offsetY * (height * 0.25);
      const outerRadius = Math.min(width, height) * 0.5 * size;

      // Base assembly orientation
      const assemblyTiltRad = ((tilt + mouseRef.current.y) * Math.PI) / 180;
      const assemblyRollRad = ((mouseRef.current.x) * Math.PI) / 180;
      const driftRad = elapsed * lightDrift * 0.25;

      // Lighting directions in studio space
      const softbox1: Vec3 = { x: -0.38, y: 0.75, z: 0.54 };
      const softbox2: Vec3 = { x: 0.52, y: -0.52, z: 0.68 };
      const gel1Dir: Vec3 = { x: 0.72, y: 0.38, z: 0.58 };
      const gel2Dir: Vec3 = { x: -0.70, y: -0.32, z: 0.64 };

      // Halo orientation when aligned
      const haloTiltRad = (haloTilt * Math.PI) / 180;

      // Array to collect polygon segments for depth sorting
      const renderSegments: PolySegment[] = [];

      // Perspective projection focal length
      const focalLength = 950;

      // Angular steps per ring (72 segments = solid circular smoothness with solid 3D depth)
      const segmentsCount = 72;
      const angleStep = (Math.PI * 2) / segmentsCount;

      for (let rIdx = 0; rIdx < clampedRings; rIdx++) {
        const ringMidRadius = outerRadius * (1.0 - rIdx * (bandWidth + spacing));
        if (ringMidRadius <= outerRadius * 0.05) continue;

        const wBand = outerRadius * bandWidth;
        const rIn = ringMidRadius - wBand * 0.5;
        const rOut = ringMidRadius + wBand * 0.5;
        const ringThickness = outerRadius * bandThickness;
        const halfThick = ringThickness * 0.5;

        // Current gyroscope tumble angles
        const axis = ringAxes[rIdx % ringAxes.length];
        const gyroAngleX = (elapsed * axis.speedX + axis.phase);
        const gyroAngleY = (elapsed * axis.speedY + axis.phase * 0.7);
        const gyroAngleZ = (elapsed * axis.speedZ + axis.phase * 1.3);

        // Blended angles: interpolate from gyroscope tumble to aligned halo plane
        const curAngleX = gyroAngleX * (1 - alignFactor) + haloTiltRad * alignFactor;
        const curAngleY = gyroAngleY * (1 - alignFactor) + 0;
        const curAngleZ = gyroAngleZ * (1 - alignFactor) + (elapsed * 0.15) * alignFactor;

        // Helper: transform a local 3D vertex to camera world coordinates
        const transformVertex = (v: Vec3): Vec3 => {
          let p = rotateEuler(v, curAngleX, curAngleY, curAngleZ);
          p = rotateX(p, assemblyTiltRad);
          p = rotateY(p, assemblyRollRad);
          return p;
        };

        // Helper: project a 3D vertex to 2D screen coordinates
        const project = (p: Vec3): [number, number] => {
          const scaleP = focalLength / (focalLength + p.z);
          return [cx + p.x * scaleP, cy + p.y * scaleP];
        };

        // Helper: compute chrome specular and ambient shading for a surface normal
        const getChromeColor = (localNormal: Vec3, phiVal: number): string => {
          let worldNormal = rotateEuler(localNormal, curAngleX, curAngleY, curAngleZ);
          worldNormal = rotateX(worldNormal, assemblyTiltRad);
          worldNormal = rotateY(worldNormal, assemblyRollRad);

          // Reflection vector R = 2(N.V)N - V where V = (0, 0, 1)
          const rx = 2 * worldNormal.z * worldNormal.x;
          const ry = 2 * worldNormal.z * worldNormal.y;
          const rz = 2 * worldNormal.z * worldNormal.z - 1;

          // Studio light drift rotation around Y
          const cosDrift = Math.cos(driftRad);
          const sinDrift = Math.sin(driftRad);
          const refX = rx * cosDrift + rz * sinDrift;
          const refY = ry;
          const refZ = -rx * sinDrift + rz * cosDrift;

          const specPower = 1.0 / (Math.max(0.01, roughness) * 0.7);

          // Softbox highlights
          const dotSb1 = Math.max(0, refX * softbox1.x + refY * softbox1.y + refZ * softbox1.z);
          const sb1 = Math.pow(dotSb1, specPower * 8) * 1.4;

          const dotSb2 = Math.max(0, refX * softbox2.x + refY * softbox2.y + refZ * softbox2.z);
          const sb2 = Math.pow(dotSb2, specPower * 5) * 0.7;

          // Gel highlights
          const dotGel1 = Math.max(0, refX * gel1Dir.x + refY * gel1Dir.y + refZ * gel1Dir.z);
          const gel1 = Math.pow(dotGel1, specPower * 6) * 1.25;

          const dotGel2 = Math.max(0, refX * gel2Dir.x + refY * gel2Dir.y + refZ * gel2Dir.z);
          const gel2 = Math.pow(dotGel2, specPower * 6) * 1.15;

          // Studio base room reflections
          const isDark = studio === 'dark';
          const horizon = Math.sin(refY * Math.PI * 0.5);
          let baseR: number, baseG: number, baseB: number;

          if (isDark) {
            baseR = 20 + horizon * 12 + 12;
            baseG = 24 + horizon * 14 + 14;
            baseB = 34 + horizon * 18 + 20;
          } else {
            baseR = 195 + horizon * 35;
            baseG = 200 + horizon * 35;
            baseB = 210 + horizon * 35;
          }

          // Iridescence sheen along grazing edges
          let iriR = 0, iriG = 0, iriB = 0;
          if (iridescence > 0) {
            const grazing = Math.pow(1 - Math.abs(worldNormal.z), 2.5) * iridescence;
            const spectralPhase = phiVal * 2 + elapsed * 1.5;
            iriR = (Math.sin(spectralPhase) * 0.5 + 0.5) * 120 * grazing;
            iriG = (Math.sin(spectralPhase + 2.09) * 0.5 + 0.5) * 130 * grazing;
            iriB = (Math.sin(spectralPhase + 4.18) * 0.5 + 0.5) * 150 * grazing;
          }

          const finalR = Math.min(255, Math.round(baseR + sb1 * 240 + sb2 * 180 + gel1 * gel1Rgb[0] * 0.9 + gel2 * gel2Rgb[0] * 0.9 + iriR));
          const finalG = Math.min(255, Math.round(baseG + sb1 * 240 + sb2 * 180 + gel1 * gel1Rgb[1] * 0.9 + gel2 * gel2Rgb[1] * 0.9 + iriG));
          const finalB = Math.min(255, Math.round(baseB + sb1 * 245 + sb2 * 190 + gel1 * gel1Rgb[2] * 0.9 + gel2 * gel2Rgb[2] * 0.9 + iriB));

          return `rgb(${finalR}, ${finalG}, ${finalB})`;
        };

        for (let j = 0; j < segmentsCount; j++) {
          const phi0 = j * angleStep;
          const phi1 = (j + 1) * angleStep;
          const midPhi = (phi0 + phi1) * 0.5;

          const cos0 = Math.cos(phi0);
          const sin0 = Math.sin(phi0);
          const cos1 = Math.cos(phi1);
          const sin1 = Math.sin(phi1);
          const cosM = Math.cos(midPhi);
          const sinM = Math.sin(midPhi);

          // 1. FRONT FACE (Z = +halfThick)
          const f0 = transformVertex({ x: rIn * cos0, y: rIn * sin0, z: halfThick });
          const f1 = transformVertex({ x: rOut * cos0, y: rOut * sin0, z: halfThick });
          const f2 = transformVertex({ x: rOut * cos1, y: rOut * sin1, z: halfThick });
          const f3 = transformVertex({ x: rIn * cos1, y: rIn * sin1, z: halfThick });

          let fNormal = rotateEuler({ x: 0, y: 0, z: 1 }, curAngleX, curAngleY, curAngleZ);
          fNormal = rotateX(fNormal, assemblyTiltRad);
          fNormal = rotateY(fNormal, assemblyRollRad);

          if (fNormal.z > -0.05) {
            renderSegments.push({
              avgZ: (f0.z + f1.z + f2.z + f3.z) * 0.25,
              p0: project(f0),
              p1: project(f1),
              p2: project(f2),
              p3: project(f3),
              color: getChromeColor({ x: 0, y: 0, z: 1 }, midPhi),
            });
          }

          // 2. BACK FACE (Z = -halfThick)
          const b0 = transformVertex({ x: rIn * cos1, y: rIn * sin1, z: -halfThick });
          const b1 = transformVertex({ x: rOut * cos1, y: rOut * sin1, z: -halfThick });
          const b2 = transformVertex({ x: rOut * cos0, y: rOut * sin0, z: -halfThick });
          const b3 = transformVertex({ x: rIn * cos0, y: rIn * sin0, z: -halfThick });

          let bNormal = rotateEuler({ x: 0, y: 0, z: -1 }, curAngleX, curAngleY, curAngleZ);
          bNormal = rotateX(bNormal, assemblyTiltRad);
          bNormal = rotateY(bNormal, assemblyRollRad);

          if (bNormal.z > -0.05) {
            renderSegments.push({
              avgZ: (b0.z + b1.z + b2.z + b3.z) * 0.25,
              p0: project(b0),
              p1: project(b1),
              p2: project(b2),
              p3: project(b3),
              color: getChromeColor({ x: 0, y: 0, z: -1 }, midPhi),
            });
          }

          // 3. OUTER RIM (r = rOut)
          const o0 = transformVertex({ x: rOut * cos0, y: rOut * sin0, z: halfThick });
          const o1 = transformVertex({ x: rOut * cos0, y: rOut * sin0, z: -halfThick });
          const o2 = transformVertex({ x: rOut * cos1, y: rOut * sin1, z: -halfThick });
          const o3 = transformVertex({ x: rOut * cos1, y: rOut * sin1, z: halfThick });

          let oNormal = rotateEuler({ x: cosM, y: sinM, z: 0 }, curAngleX, curAngleY, curAngleZ);
          oNormal = rotateX(oNormal, assemblyTiltRad);
          oNormal = rotateY(oNormal, assemblyRollRad);

          if (oNormal.z > -0.05) {
            renderSegments.push({
              avgZ: (o0.z + o1.z + o2.z + o3.z) * 0.25,
              p0: project(o0),
              p1: project(o1),
              p2: project(o2),
              p3: project(o3),
              color: getChromeColor({ x: cosM, y: sinM, z: 0 }, midPhi),
            });
          }

          // 4. INNER RIM (r = rIn)
          const i0 = transformVertex({ x: rIn * cos1, y: rIn * sin1, z: halfThick });
          const i1 = transformVertex({ x: rIn * cos1, y: rIn * sin1, z: -halfThick });
          const i2 = transformVertex({ x: rIn * cos0, y: rIn * sin0, z: -halfThick });
          const i3 = transformVertex({ x: rIn * cos0, y: rIn * sin0, z: halfThick });

          let iNormal = rotateEuler({ x: -cosM, y: -sinM, z: 0 }, curAngleX, curAngleY, curAngleZ);
          iNormal = rotateX(iNormal, assemblyTiltRad);
          iNormal = rotateY(iNormal, assemblyRollRad);

          if (iNormal.z > -0.05) {
            renderSegments.push({
              avgZ: (i0.z + i1.z + i2.z + i3.z) * 0.25,
              p0: project(i0),
              p1: project(i1),
              p2: project(i2),
              p3: project(i3),
              color: getChromeColor({ x: -cosM, y: -sinM, z: 0 }, midPhi),
            });
          }
        }
      }

      // Painter's Algorithm: Sort all solid segments from back to front
      renderSegments.sort((a, b) => b.avgZ - a.avgZ);

      // Render all sorted metallic chrome quadrilaterals
      for (let s = 0; s < renderSegments.length; s++) {
        const seg = renderSegments[s];
        ctx.fillStyle = seg.color;
        ctx.beginPath();
        ctx.moveTo(seg.p0[0], seg.p0[1]);
        ctx.lineTo(seg.p1[0], seg.p1[1]);
        ctx.lineTo(seg.p2[0], seg.p2[1]);
        ctx.lineTo(seg.p3[0], seg.p3[1]);
        ctx.closePath();
        ctx.fill();
      }

      // Atmospheric center glow when in halo mode
      if (alignFactor > 0.05) {
        const haloGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius * 0.9);
        const [gr1, gg1, gb1] = gel1Rgb;
        const [gr2, gg2, gb2] = gel2Rgb;
        haloGlow.addColorStop(0, `rgba(${gr1}, ${gg1}, ${gb1}, ${(0.14 * alignFactor).toFixed(3)})`);
        haloGlow.addColorStop(0.5, `rgba(${gr2}, ${gg2}, ${gb2}, ${(0.07 * alignFactor).toFixed(3)})`);
        haloGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [
    colors,
    studio,
    rings,
    size,
    spacing,
    bandWidth,
    bandThickness,
    roughness,
    iridescence,
    speed,
    tilt,
    lightDrift,
    offsetX,
    offsetY,
    interactive,
    parallax,
    haloTilt,
    paused,
    prefersReducedMotion,
    quality,
  ]);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className={`relative w-full h-full min-h-[240px] flex items-center justify-center select-none ${
        clickAlign ? 'cursor-pointer' : ''
      } ${className}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
        aria-hidden="true"
      />
      {children && (
        <div className="relative z-10 pointer-events-none flex items-center justify-center w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
});

ChromeOrbit.displayName = 'ChromeOrbit';

export default ChromeOrbit;
