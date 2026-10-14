import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useSyncExternalStore,
} from 'react';
import * as THREE from 'three';
import { cn } from '../../lib/utils';

export interface TerminalRainProps {
  /** Colour of the falling trails and colour of the bright glyph leading each stream. Default: ["#9D7BFF", "#FFD6F5"] */
  colors?: [string, string];
  /** Colour behind the rain. Can be any CSS color or "transparent". Default: "#0A0A0A" */
  backgroundColor?: string;
  /** glow adds light for dark backgrounds, ink prints coloured glyphs for light ones. auto picks from the background brightness. Default: "auto" */
  mode?: 'auto' | 'glow' | 'ink';
  /** Characters the streams are made of. Any string works: binary, hex, letters, symbols or your brand's characters. */
  glyphs?: string;
  /** Font used to draw the glyphs. Use a font that is already loaded on the page. */
  fontFamily?: string;
  /** Height of the glyphs in pixels. Default: 18 */
  glyphSize?: number;
  /** Horizontal gap between columns, from 0.6 (packed) to 3 (sparse). Default: 1 */
  spacing?: number;
  /** Share of columns carrying a stream at any moment, from 0 to 1. Default: 0.45 */
  density?: number;
  /** Length of each stream's fading trail, in glyphs. Default: 16 */
  trail?: number;
  /** How fast the streams fall. Default: 1 */
  speed?: number;
  /** How much fall speed varies between columns, from 0 (uniform) to 1. Default: 0.5 */
  variance?: number;
  /** Tilt of the rain in degrees, as if blown by wind. Default: 0 */
  angle?: number;
  /** How often glyphs in the trails change character, from 0 (frozen) to 1. Default: 0.35 */
  shuffle?: number;
  /** Draw every glyph mirrored, as in the classic film titles. Default: false */
  mirror?: boolean;
  /** Visibility of a second, smaller and slower layer of rain behind the first, from 0 (off) to 1. Default: 0.6 */
  depth?: number;
  /** Soft bloom around the bright glyphs, from 0 to 3. Default: 0.22 */
  glow?: number;
  /** Overall exposure. Default: 1 */
  intensity?: number;
  /** Respond to the pointer. Default: true */
  interactive?: boolean;
  /** Time slows around the pointer: streams crawl past it and their trails linger, then pick up speed again. Default: true */
  bulletTime?: boolean;
  /** Radius of the slowed zone around the pointer, in pixels. Default: 170 */
  slowRadius?: number;
  /** How much time slows at the centre of the zone, from 0 (no effect) to 1 (nearly frozen). Default: 0.6 */
  slowStrength?: number;
  /** Clicking releases a cascade of new streams from the click point, fanning out column by column. Default: true */
  clickBurst?: boolean;
  /** How many columns a click cascade spans, from 0 to 3. Default: 1 */
  burstSize?: number;
  /** Freeze the rain. Reduced-motion users always get a still frame. Default: false */
  paused?: boolean;
  /** Resolution scale from 0.25 to 1. Lower values are cheaper on large screens. Default: 1 */
  quality?: number;
  /** Additional CSS classes for the root element. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** Content placed over the background. */
  children?: React.ReactNode;
}

export interface TerminalRainHandle {
  burst: (x?: number, y?: number) => void;
}

export const TERMINAL_RAIN_GLYPHS = {
  katakana: "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF",
  binary: "01",
  hex: "0123456789ABCDEF",
  latin: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  symbols: "+-*/=<>[]{}()#$%&@!?;:",
};

export const TERMINAL_RAIN_PRESETS = {
  aurora: { dark: ["#9D7BFF", "#FFD6F5"], light: ["#5B2BFF", "#D13DB8"], glyphs: "katakana", density: 0.45, trail: 16, speed: 1, angle: 0 },
  matrix: { dark: ["#3DFF8A", "#E8FFF0"], light: ["#0B7A3B", "#064D25"], glyphs: "katakana", density: 0.45, trail: 16, speed: 1, angle: 0 },
  amber: { dark: ["#FFB000", "#FFF1C9"], light: ["#B45309", "#78350F"], glyphs: "hex", density: 0.45, trail: 16, speed: 1, angle: 0 },
  binary: { dark: ["#9D7BFF", "#FFD6F5"], light: ["#5B2BFF", "#D13DB8"], glyphs: "binary", density: 0.45, trail: 20, speed: 1, angle: 0 },
  storm: { dark: ["#9D7BFF", "#FFD6F5"], light: ["#5B2BFF", "#D13DB8"], glyphs: "katakana", density: 0.7, trail: 22, speed: 1.6, angle: -14 },
  drizzle: { dark: ["#9D7BFF", "#FFD6F5"], light: ["#5B2BFF", "#D13DB8"], glyphs: "katakana", density: 0.22, trail: 26, speed: 0.55, angle: 0 },
  mono: { dark: ["#CFCFCF", "#FFFFFF"], light: ["#1A1A1A", "#555555"], glyphs: "katakana", density: 0.45, trail: 16, speed: 1, angle: 0 },
};

const DEFAULT_GLYPHS = TERMINAL_RAIN_GLYPHS.katakana;
const DEFAULT_FONT_FAMILY = 'ui-monospace, "SF Mono", Menlo, Consolas, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", monospace';

const subscribeReducedMotion = (cb: () => void) => {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

const getReducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

let canvas2D: CanvasRenderingContext2D | null = null;
const parseCssColor = (color: string, fallback: [number, number, number]): [number, number, number] => {
  if (color === "transparent") return [0, 0, 0];
  if (!canvas2D) canvas2D = document.createElement("canvas").getContext("2d");
  if (!canvas2D) return fallback;
  canvas2D.fillStyle = "#010203";
  canvas2D.fillStyle = color;
  const str = String(canvas2D.fillStyle);
  if (str === "#010203" && color.trim().toLowerCase() !== "#010203") return fallback;
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const match = str.match(/[\d.]+/g);
  return !match || match.length < 3 ? fallback : [Number(match[0]) / 255, Number(match[1]) / 255, Number(match[2]) / 255];
};

const srgbToLinear = (e: number) => (e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4));

const rgbToOklab = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};

const HOVER_SHADER_CHUNK = `
uniform vec4 uHover;
uniform float uSlow;

float rateAt(vec2 s) {
  vec2 gap = s - uHover.xy;
  float slow = uSlow * uHover.z * exp(-dot(gap, gap) / (uHover.w * uHover.w));
  return max(1.0 - slow, 0.02);
}
`;

const GRID_SHADER_CHUNK = `
uniform vec2 uCenter;
uniform float uAngle;

vec2 toGrid(vec2 s, vec2 origin, vec2 cell) {
  vec2 d = s - uCenter;
  float c = cos(uAngle);
  float n = sin(uAngle);
  vec2 r = vec2(c * d.x + n * d.y, -n * d.x + c * d.y) + uCenter;
  return (r - origin) / cell;
}

vec2 toScreen(vec2 g, vec2 origin, vec2 cell) {
  vec2 r = origin + g * cell - uCenter;
  float c = cos(uAngle);
  float n = sin(uAngle);
  return vec2(c * r.x - n * r.y, n * r.x + c * r.y) + uCenter;
}
`;

const STATE_SHADER = `
precision highp float;
uniform sampler2D uPrevious;
uniform sampler2D uHeads;
uniform vec2 uOrigin;
uniform vec2 uCell;
uniform float uDt;
uniform float uTrail;
uniform float uShuffle;
uniform float uGlyphCount;
uniform float uSeed;
${GRID_SHADER_CHUNK}
${HOVER_SHADER_CHUNK}
out vec4 fragColor;

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec4 previous = texelFetch(uPrevious, cell, 0);
  float speed = texelFetch(uHeads, ivec2(0, cell.x), 0).x;
  vec2 screen = toScreen(vec2(cell) + 0.5, uOrigin, uCell);
  float rate = rateAt(screen);
  float tau = uTrail / max(speed, 0.5) / 2.2;
  float light = previous.x * exp(-uDt * rate / tau);
  float glyph = previous.y;
  float row = float(cell.y) + 0.5;
  for (int k = 1; k <= 3; k++) {
    vec4 head = texelFetch(uHeads, ivec2(k, cell.x), 0);
    if (head.z > 0.5 && head.x < row && row <= head.y) {
      light = max(light, clamp(head.z - 0.5, 0.0, 1.0));
      glyph = floor(hash(vec3(vec2(cell), head.w * 97.0 + row)) * uGlyphCount);
    }
  }
  float churn = uShuffle * 2.5 * rate * uDt;
  if (hash(vec3(vec2(cell), uSeed)) < churn) glyph = floor(hash(vec3(vec2(cell) + 17.0, uSeed * 1.7)) * uGlyphCount);
  fragColor = vec4(light, glyph, 0.0, 1.0);
}
`;

const VERTEX_SHADER = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const COMPOSITE_LAYER_SHADER = `
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform vec2 uResolution;
uniform float uMirror;
uniform float uGlyphScale;
uniform vec3 uLabTrail;
uniform vec3 uLabHead;
uniform float uInk;
uniform sampler2D uState0;
uniform sampler2D uHeads0;
uniform vec2 uOrigin0;
uniform vec4 uGrid0;
uniform sampler2D uState1;
uniform sampler2D uHeads1;
uniform vec2 uOrigin1;
uniform vec4 uGrid1;
uniform float uFar;
${GRID_SHADER_CHUNK}
in vec2 vUv;
out vec4 fragColor;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec4 layer(sampler2D state, sampler2D heads, vec2 origin, vec4 grid, float bias) {
  vec2 screen = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = toGrid(screen, origin, grid.xy);
  ivec2 cell = ivec2(floor(g));
  if (cell.x < 0 || cell.y < 0 || float(cell.x) >= grid.z || float(cell.y) >= grid.w) return vec4(0.0);
  vec4 data = texelFetch(state, cell, 0);
  float light = data.x;
  float glyph = data.y;
  float head = 0.0;
  for (int k = 1; k <= 3; k++) {
    vec4 h = texelFetch(heads, ivec2(k, cell.x), 0);
    if (h.z > 0.5 && floor(h.y) == float(cell.y)) {
      head = clamp(h.z - 0.5, 0.0, 1.0);
      glyph = floor(hash(vec3(vec2(cell), h.w * 31.0 + floor(h.y * 3.0))) * max(uAtlasGrid.x * uAtlasGrid.y, 1.0));
    }
  }
  if (light < 0.004 && head < 0.5) return vec4(0.0);
  vec2 f = fract(g);
  vec2 local = vec2(f.x - 0.5, f.y - 0.5);
  if (uMirror > 0.5) local.x = -local.x;
  vec2 span = vec2(grid.x / grid.y, 1.0) * 0.84 * uGlyphScale;
  vec2 texel = 0.5 + local * span;
  float inside = step(0.02, texel.x) * step(texel.x, 0.98) * step(0.02, texel.y) * step(texel.y, 0.98);
  float index = mod(glyph, uAtlasGrid.x * uAtlasGrid.y);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + texel) / uAtlasGrid;
  vec2 scale = span / uAtlasGrid;
  float coverage = textureGrad(uAtlas, uv, dFdx(g) * scale * exp2(bias), dFdy(g) * scale * exp2(bias)).r * inside;
  float flicker = 0.82 + 0.18 * hash(vec3(vec2(cell), glyph));
  float fresh = smoothstep(0.55, 1.0, light);
  vec3 trailTone = labToLinear(mix(vec3(uLabTrail.x * 0.55, uLabTrail.yz * 0.9), uLabTrail, smoothstep(0.0, 0.6, light)));
  vec3 tone = mix(trailTone, labToLinear(uLabHead), fresh * 0.35);
  vec3 headTone = labToLinear(uLabHead);
  vec3 inkHead = labToLinear(vec3(uLabTrail.x * 0.55, uLabTrail.yz * 1.1));
  headTone = mix(headTone, inkHead, uInk);
  float fade = light * (0.35 + 0.65 * light);
  float energy = coverage * (fade * flicker * 0.8 + head * 0.9);
  vec3 color = mix(tone, headTone, head) * energy;
  return vec4(color, energy);
}

void main() {
  vec4 near = layer(uState0, uHeads0, uOrigin0, uGrid0, 0.0);
  vec4 far = uFar > 0.0 ? layer(uState1, uHeads1, uOrigin1, uGrid1, 1.2) * uFar : vec4(0.0);
  fragColor = near + far;
}
`;

const DOWNSAMPLE_SHADER = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`;

const UPSAMPLE_SHADER = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`;

const FINAL_OUTPUT_SHADER = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uTransparent;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  float alpha = 1.0;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
    if (uTransparent > 0.5) {
      color = exposed;
      alpha = clamp(peak * 1.5 + length(bloom.rgb) * uGlow, 0.0, 1.0);
    }
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
    if (uTransparent > 0.5) {
      color = clamp(hue * 0.85, 0.0, 1.0);
      alpha = cover;
    }
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), alpha);
}
`;

interface LayerData {
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  speedScale: number;
  gain: number;
  bias: number;
  columnSpeed: Float32Array;
  heads: Float32Array;
  respawn: Float32Array;
  headTexture: THREE.DataTexture;
  targets: THREE.WebGLRenderTarget[];
  index: number;
}

export const TerminalRain = forwardRef<TerminalRainHandle, TerminalRainProps>(function (
  {
    colors = ["#9D7BFF", "#FFD6F5"],
    backgroundColor = "#0A0A0A",
    mode = "auto",
    glyphs = DEFAULT_GLYPHS,
    fontFamily = DEFAULT_FONT_FAMILY,
    glyphSize = 18,
    spacing = 1,
    density = 0.45,
    trail = 16,
    speed = 1,
    variance = 0.5,
    angle = 0,
    shuffle = 0.35,
    mirror = false,
    depth = 0.6,
    glow = 0.22,
    intensity = 1,
    interactive = true,
    bulletTime = true,
    slowRadius = 170,
    slowStrength = 0.6,
    clickBurst = true,
    burstSize = 1,
    paused = false,
    quality = 1,
    className,
    style,
    children,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<{
    sync: () => void;
    destroy: () => void;
    burst: (x: number, y: number) => void;
  } | null>(null);

  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);

  const propsRef = useRef({
    colors,
    backgroundColor,
    mode,
    glyphs,
    fontFamily,
    glyphSize,
    spacing,
    density,
    trail,
    speed,
    variance,
    angle,
    shuffle,
    mirror,
    depth,
    glow,
    intensity,
    interactive,
    bulletTime,
    slowRadius,
    slowStrength,
    clickBurst,
    burstSize,
    paused,
    quality,
    reduced: reducedMotion,
  });

  useEffect(() => {
    propsRef.current = {
      colors,
      backgroundColor,
      mode,
      glyphs,
      fontFamily,
      glyphSize,
      spacing,
      density,
      trail,
      speed,
      variance,
      angle,
      shuffle,
      mirror,
      depth,
      glow,
      intensity,
      interactive,
      bulletTime,
      slowRadius,
      slowStrength,
      clickBurst,
      burstSize,
      paused,
      quality,
      reduced: reducedMotion,
    };
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const controller = ((container: HTMLElement, configRef: typeof propsRef) => {
      let renderer: THREE.WebGLRenderer;
      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.pointerEvents = "none";
      container.prepend(canvas);

      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        });
      } catch {
        canvas.remove();
        return null;
      }

      if (!renderer.capabilities.isWebGL2) {
        renderer.dispose();
        canvas.remove();
        return null;
      }

      renderer.autoClear = false;

      const hasFloatExt = renderer.extensions.has("EXT_color_buffer_float");
      const bufferType =
        hasFloatExt || renderer.extensions.has("EXT_color_buffer_half_float")
          ? THREE.HalfFloatType
          : THREE.UnsignedByteType;
      const headType = hasFloatExt ? THREE.FloatType : THREE.HalfFloatType;

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quadGeom = new THREE.PlaneGeometry(2, 2);

      const pointer = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        goalX: 0,
        goalY: 0,
        amount: 0,
        inside: false,
        placed: false,
      };

      const hoverUniforms = {
        uHover: { value: new THREE.Vector4(0, 0, 0, 100) },
        uSlow: { value: 0.9 },
      };

      const gridUniforms = {
        uCenter: { value: new THREE.Vector2() },
        uAngle: { value: 0 },
      };

      const createMaterial = (fragShader: string, uniforms: Record<string, { value: any }>) =>
        new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          uniforms,
          vertexShader: VERTEX_SHADER,
          fragmentShader: fragShader,
          depthTest: false,
          depthWrite: false,
          blending: THREE.NoBlending,
        });

      const stateMaterial = createMaterial(STATE_SHADER, {
        ...hoverUniforms,
        ...gridUniforms,
        uPrevious: { value: null },
        uHeads: { value: null },
        uOrigin: { value: new THREE.Vector2() },
        uCell: { value: new THREE.Vector2(1, 1) },
        uDt: { value: 0 },
        uTrail: { value: 16 },
        uShuffle: { value: 0.4 },
        uGlyphCount: { value: 1 },
        uSeed: { value: 0 },
      });

      const compositeMaterial = createMaterial(COMPOSITE_LAYER_SHADER, {
        ...gridUniforms,
        uAtlas: { value: null },
        uAtlasGrid: { value: new THREE.Vector2(16, 1) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMirror: { value: 0 },
        uGlyphScale: { value: 1 },
        uLabTrail: { value: new THREE.Vector3() },
        uLabHead: { value: new THREE.Vector3() },
        uInk: { value: 0 },
        uState0: { value: null },
        uHeads0: { value: null },
        uOrigin0: { value: new THREE.Vector2() },
        uGrid0: { value: new THREE.Vector4(1, 1, 1, 1) },
        uState1: { value: null },
        uHeads1: { value: null },
        uOrigin1: { value: new THREE.Vector2() },
        uGrid1: { value: new THREE.Vector4(1, 1, 1, 1) },
        uFar: { value: 0 },
      });

      const downsampleMaterial = createMaterial(DOWNSAMPLE_SHADER, {
        uSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
      });

      const upsampleMaterial = createMaterial(UPSAMPLE_SHADER, {
        uSource: { value: null },
        uBase: { value: null },
        uTexel: { value: new THREE.Vector2() },
      });

      const outputMaterial = createMaterial(FINAL_OUTPUT_SHADER, {
        uLines: { value: null },
        uBloom: { value: null },
        uBackground: { value: new THREE.Vector3() },
        uTransparent: { value: 0 },
        uGlow: { value: 0.5 },
        uExposure: { value: 1.4 },
        uMode: { value: 0 },
        uGrain: { value: 0 },
      });

      const quadMesh = new THREE.Mesh(quadGeom, outputMaterial);
      quadMesh.frustumCulled = false;

      const scene = new THREE.Scene();
      scene.add(quadMesh);

      const createRenderTarget = (w: number, h: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter) =>
        new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
          type,
          format: THREE.RGBAFormat,
          minFilter: filter,
          magFilter: filter,
          depthBuffer: false,
          stencilBuffer: false,
          generateMipmaps: false,
        });

      let renderTargetMain: THREE.WebGLRenderTarget | null = null;
      let downTargets: THREE.WebGLRenderTarget[] = [];
      let upTargets: THREE.WebGLRenderTarget[] = [];
      let layers: LayerData[] = [];
      let lastLayoutKey = "";
      let atlasData: { texture: THREE.CanvasTexture; count: number; rows: number } | null = null;
      let lastAtlasKey = "";
      let isDestroyed = false;
      let animFrameId = 0;
      let lastTime = 0;
      let isVisible = true;
      let width = 1;
      let height = 1;
      let pixelRatio = 1;
      let grainPhase = 0;
      let randomSeed = 97;

      const nextRandom = () => (randomSeed = (16807 * randomSeed) % 0x7fffffff) / 0x7fffffff;

      const disposeBloomTargets = () => {
        renderTargetMain?.dispose();
        downTargets.forEach((t) => t.dispose());
        upTargets.forEach((t) => t.dispose());
        renderTargetMain = null;
        downTargets = [];
        upTargets = [];
      };

      const disposeLayers = () => {
        layers.forEach((l) => {
          l.targets.forEach((t) => t.dispose());
          l.headTexture.dispose();
        });
        layers = [];
      };

      const renderPass = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
        quadMesh.material = material;
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
      };

      const buildAtlas = () => {
        const cfg = configRef.current;
        const glyphStr = String(cfg.glyphs ?? "") || DEFAULT_GLYPHS;
        const font = String(cfg.fontFamily ?? "") || DEFAULT_FONT_FAMILY;
        const size = Math.round(clamp(clamp(cfg.glyphSize ?? 18, 6, 64) * pixelRatio * 1.25, 16, 128));
        const key = `${glyphStr}|${font}|${size}`;

        if (key !== lastAtlasKey || !atlasData) {
          lastAtlasKey = key;
          atlasData?.texture.dispose();

          const chars = Array.from(new Set(Array.from(glyphStr.replace(/\s/g, "")))).slice(0, 512);
          if (!chars.length) chars.push("0", "1");
          const rowCount = Math.ceil(chars.length / 16);

          const canvas = document.createElement("canvas");
          canvas.width = 16 * size;
          canvas.height = rowCount * size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `500 ${Math.round(0.78 * size)}px ${font}`;
            chars.forEach((c, i) => {
              const x = (i % 16) * size + size / 2;
              const y = Math.floor(i / 16) * size + size / 2 + 0.04 * size;
              ctx.fillText(c, x, y);
            });
          }

          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          texture.anisotropy = 4;
          texture.needsUpdate = true;

          atlasData = { texture, count: chars.length, rows: rowCount };
          compositeMaterial.uniforms.uAtlas.value = atlasData.texture;
          compositeMaterial.uniforms.uAtlasGrid.value.set(16, atlasData.rows);
          stateMaterial.uniforms.uGlyphCount.value = atlasData.count;
        }
      };

      const computeSlowRateAt = (x: number, y: number) => {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const radius = hoverUniforms.uHover.value.w;
        return Math.max(
          1 - clamp(configRef.current.slowStrength ?? 0.6, 0, 1) * pointer.amount * Math.exp(-(dx * dx + dy * dy) / (radius * radius)),
          0.02
        );
      };

      const computeRespawnDelay = (streamTime: number, layerIdx: number) => {
        const dens = clamp(configRef.current.density ?? 0.45, 0.02, 1) * (layerIdx === 0 ? 1 : 0.3);
        return streamTime * (1 / dens - 1) * (0.4 + 1.2 * nextRandom());
      };

      const initLayer = (scale: number, speedScale: number, gain: number, bias: number): LayerData => {
        const cfg = configRef.current;
        const renderW = width * pixelRatio;
        const renderH = height * pixelRatio;
        const baseGlyphPx = clamp(cfg.glyphSize ?? 18, 6, 64) * pixelRatio * scale;
        const cellW = 0.68 * baseGlyphPx * clamp(cfg.spacing ?? 1, 0.6, 3);
        const cellH = 1.05 * baseGlyphPx;
        const angleRad = (clamp(cfg.angle ?? 0, -80, 80) * Math.PI) / 180;

        const cols = Math.ceil((renderW * Math.abs(Math.cos(angleRad)) + renderH * Math.abs(Math.sin(angleRad))) / cellW) + 2;
        const rows = Math.ceil((renderW * Math.abs(Math.sin(angleRad)) + renderH * Math.abs(Math.cos(angleRad))) / cellH) + 2;

        const originX = renderW / 2 - (cols * cellW) / 2;
        const originY = renderH / 2 - (rows * cellH) / 2;

        const columnSpeed = new Float32Array(cols);
        const heads = new Float32Array(4 * cols * 4);
        const respawn = new Float32Array(3 * cols);
        const varianceVal = clamp(cfg.variance ?? 0.5, 0, 1);
        const baseSpeed = Math.max(9 * clamp(cfg.speed ?? 1, 0, 5) * speedScale, 0.5);

        for (let c = 0; c < cols; c++) {
          columnSpeed[c] = Math.max(0.3, 1 + (2 * nextRandom() - 1) * varianceVal * 0.75);
          const colSpeed = baseSpeed * columnSpeed[c];
          const streamDuration = (rows + 3) / colSpeed;

          for (let s = 0; s < 3; s++) {
            const hOffset = (4 * c + s + 1) * 4;
            if (s === 2) {
              heads.set([0, 0, 0, nextRandom()], hOffset);
              respawn[3 * c + s] = Infinity;
              continue;
            }
            const delay = computeRespawnDelay(streamDuration, s);
            const rTime = nextRandom() * (streamDuration + delay);
            if (rTime < streamDuration) {
              const startRow = -2 + rTime * colSpeed;
              heads.set([startRow, startRow, 1.5, nextRandom()], hOffset);
            } else {
              heads.set([0, 0, 0, nextRandom()], hOffset);
              respawn[3 * c + s] = rTime - streamDuration;
            }
          }
        }

        const headTexture = new THREE.DataTexture(heads, 4, cols, THREE.RGBAFormat, headType);
        headTexture.minFilter = THREE.NearestFilter;
        headTexture.magFilter = THREE.NearestFilter;
        headTexture.needsUpdate = true;

        const targets = [0, 1].map(() => createRenderTarget(cols, rows, bufferType, THREE.NearestFilter));
        for (const t of targets) {
          renderer.setRenderTarget(t);
          renderer.setClearColor(0, 0);
          renderer.clear();
        }

        return {
          cellW,
          cellH,
          cols,
          rows,
          originX,
          originY,
          speedScale,
          gain,
          bias,
          columnSpeed,
          heads,
          respawn,
          headTexture,
          targets,
          index: 0,
        };
      };

      const toScreenCoord = (layer: LayerData, col: number, row: number): [number, number] => {
        const ang = gridUniforms.uAngle.value;
        const cx = (width * pixelRatio) / 2;
        const cy = (height * pixelRatio) / 2;
        const localX = layer.originX + col * layer.cellW - cx;
        const localY = layer.originY + row * layer.cellH - cy;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        return [cosA * localX - sinA * localY + cx, sinA * localX + cosA * localY + cy];
      };

      const stepHeads = (layer: LayerData, dt: number) => {
        const spd = 9 * clamp(configRef.current.speed ?? 1, 0, 5) * layer.speedScale;
        for (let c = 0; c < layer.cols; c++) {
          const colSpd = spd * layer.columnSpeed[c];
          layer.heads[4 * c * 4] = colSpd;

          for (let s = 0; s < 3; s++) {
            const hOffset = (4 * c + s + 1) * 4;
            const respawnIdx = 3 * c + s;
            if (layer.heads[hOffset + 2] > 0.5) {
              if (layer.heads[hOffset + 2] < 1.5) {
                layer.heads[hOffset + 2] = Math.min(1.5, layer.heads[hOffset + 2] + dt / 0.3);
              }
              const oldHead = layer.heads[hOffset + 1];
              const [sx, sy] = toScreenCoord(layer, c + 0.5, oldHead);
              layer.heads[hOffset] = oldHead;
              layer.heads[hOffset + 1] = oldHead + colSpd * computeSlowRateAt(sx, sy) * dt;

              if (layer.heads[hOffset + 1] > layer.rows + 1) {
                layer.heads[hOffset + 2] = 0;
                layer.respawn[respawnIdx] =
                  s === 2 ? Infinity : computeRespawnDelay((layer.rows + 3) / Math.max(colSpd, 0.5), s);
              }
            } else if (layer.respawn[respawnIdx] !== Infinity) {
              layer.respawn[respawnIdx] -= dt;
              if (layer.respawn[respawnIdx] <= 0) {
                const startRow = s === 2 ? layer.heads[hOffset + 1] : -2 - 2 * nextRandom();
                layer.heads.set([startRow, startRow, s === 2 ? 0.52 : 1.5, nextRandom()], hOffset);
              }
            }
          }
        }
        layer.headTexture.needsUpdate = true;
      };

      const stepState = (layer: LayerData, dt: number) => {
        const cfg = configRef.current;
        const u = stateMaterial.uniforms;
        u.uPrevious.value = layer.targets[layer.index].texture;
        u.uHeads.value = layer.headTexture;
        u.uOrigin.value.set(layer.originX, layer.originY);
        u.uCell.value.set(layer.cellW, layer.cellH);
        u.uDt.value = dt;
        u.uTrail.value = clamp(cfg.trail ?? 16, 2, 80);
        u.uShuffle.value = clamp(cfg.shuffle ?? 0.35, 0, 1);
        u.uSeed.value = 1000 * nextRandom();

        renderPass(stateMaterial, layer.targets[1 - layer.index]);
        layer.index = 1 - layer.index;
      };

      const updateLayout = () => {
        const cfg = configRef.current;
        const depthVal = clamp(cfg.depth ?? 0.6, 0, 1);
        const layoutKey = [
          width,
          height,
          pixelRatio,
          cfg.glyphSize,
          cfg.spacing,
          cfg.angle,
          depthVal > 0,
          cfg.variance,
        ].join("|");

        if (layoutKey === lastLayoutKey && layers.length) return;
        lastLayoutKey = layoutKey;
        disposeLayers();

        gridUniforms.uAngle.value = (clamp(cfg.angle ?? 0, -80, 80) * Math.PI) / 180;
        gridUniforms.uCenter.value.set((width * pixelRatio) / 2, (height * pixelRatio) / 2);

        layers = [initLayer(1, 1, 1, 0)];
        if (depthVal > 0) {
          layers.push(initLayer(0.62, 0.58, 1, 1.2));
        }

        const warmupDt = 1 / 30;
        for (let t = 0; t < 3; t += warmupDt) {
          for (const lyr of layers) {
            stepHeads(lyr, warmupDt);
            stepState(lyr, warmupDt);
          }
        }
      };

      const updateUniforms = () => {
        const cfg = configRef.current;
        const wPx = width * pixelRatio;
        const hPx = height * pixelRatio;
        const isTransparent = cfg.backgroundColor === "transparent";
        const bgRgb = parseCssColor(cfg.backgroundColor ?? "#0A0A0A", [0.04, 0.04, 0.04]);
        const bgLuminance = isTransparent ? 0.0 : 0.2126 * bgRgb[0] + 0.7152 * bgRgb[1] + 0.0722 * bgRgb[2];
        const isInk = cfg.mode === "ink" || (cfg.mode === "auto" && bgLuminance > 0.5);

        const trailLab = rgbToOklab(parseCssColor(cfg.colors?.[0] ?? "#9D7BFF", [0.6, 0.48, 1]));
        const headLab = rgbToOklab(parseCssColor(cfg.colors?.[1] ?? "#FFD6F5", [1, 0.84, 0.96]));

        const cu = compositeMaterial.uniforms;
        cu.uResolution.value.set(wPx, hPx);
        cu.uMirror.value = cfg.mirror ? 1 : 0;
        cu.uLabTrail.value.set(trailLab[0], trailLab[1], trailLab[2]);
        cu.uLabHead.value.set(headLab[0], headLab[1], headLab[2]);
        cu.uInk.value = isInk ? 1 : 0;

        const lyr0 = layers[0];
        if (lyr0) {
          cu.uState0.value = lyr0.targets[lyr0.index].texture;
          cu.uHeads0.value = lyr0.headTexture;
          cu.uOrigin0.value.set(lyr0.originX, lyr0.originY);
          cu.uGrid0.value.set(lyr0.cellW, lyr0.cellH, lyr0.cols, lyr0.rows);
        }

        const lyr1 = layers[1];
        cu.uFar.value = lyr1 ? 0.32 * clamp(cfg.depth ?? 0.6, 0, 1) : 0;
        if (lyr1) {
          cu.uState1.value = lyr1.targets[lyr1.index].texture;
          cu.uHeads1.value = lyr1.headTexture;
          cu.uOrigin1.value.set(lyr1.originX, lyr1.originY);
          cu.uGrid1.value.set(lyr1.cellW, lyr1.cellH, lyr1.cols, lyr1.rows);
        }

        hoverUniforms.uSlow.value = clamp(cfg.slowStrength ?? 0.6, 0, 1);
        hoverUniforms.uHover.value.set(
          pointer.x,
          pointer.y,
          pointer.amount,
          clamp(cfg.slowRadius ?? 170, 20, 800) * pixelRatio
        );

        const ou = outputMaterial.uniforms;
        ou.uBackground.value.set(srgbToLinear(bgRgb[0]), srgbToLinear(bgRgb[1]), srgbToLinear(bgRgb[2]));
        ou.uTransparent.value = isTransparent ? 1 : 0;
        ou.uGlow.value = clamp(cfg.glow ?? 0.22, 0, 3);
        ou.uExposure.value = (isInk ? 5 : 1.25) * clamp(cfg.intensity ?? 1, 0, 4);
        ou.uMode.value = isInk ? 1 : 0;
        ou.uGrain.value = grainPhase;
      };

      const renderFrame = () => {
        if (!renderTargetMain || !downTargets.length) return;
        buildAtlas();
        updateLayout();
        updateUniforms();

        renderPass(compositeMaterial, renderTargetMain);

        let currSrc: THREE.WebGLRenderTarget = renderTargetMain;
        for (const dt of downTargets) {
          downsampleMaterial.uniforms.uSource.value = currSrc.texture;
          downsampleMaterial.uniforms.uTexel.value.set(1 / currSrc.width, 1 / currSrc.height);
          renderPass(downsampleMaterial, dt);
          currSrc = dt;
        }

        let currBloom: THREE.WebGLRenderTarget = downTargets[downTargets.length - 1];
        for (let i = downTargets.length - 2; i >= 0; i--) {
          upsampleMaterial.uniforms.uSource.value = currBloom.texture;
          upsampleMaterial.uniforms.uBase.value = downTargets[i].texture;
          upsampleMaterial.uniforms.uTexel.value.set(1 / currBloom.width, 1 / currBloom.height);
          renderPass(upsampleMaterial, upTargets[i]);
          currBloom = upTargets[i];
        }

        outputMaterial.uniforms.uLines.value = renderTargetMain.texture;
        outputMaterial.uniforms.uBloom.value = currBloom.texture;
        renderPass(outputMaterial, null);
      };

      const onTick = (now: number) => {
        animFrameId = 0;
        if (isDestroyed) return;

        const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;

        const cfg = configRef.current;
        const targetHover =
          pointer.inside && cfg.interactive && cfg.bulletTime && !cfg.reduced ? 1 : 0;

        pointer.amount += (targetHover - pointer.amount) * (1 - Math.exp(-dt / 0.35));
        pointer.vx += (81 * (pointer.goalX - pointer.x) - 18 * pointer.vx) * dt;
        pointer.vy += (81 * (pointer.goalY - pointer.y) - 18 * pointer.vy) * dt;
        pointer.x += pointer.vx * dt;
        pointer.y += pointer.vy * dt;

        if (!cfg.paused && !cfg.reduced) {
          buildAtlas();
          updateLayout();
          updateUniforms();
          for (const lyr of layers) {
            stepHeads(lyr, dt);
            stepState(lyr, dt);
          }
          grainPhase = (grainPhase + 0.618034) % 1;
        }

        renderFrame();

        const activeCfg = configRef.current;
        const isRunning = !activeCfg.paused && !activeCfg.reduced;
        const hoverActive =
          Math.abs(pointer.amount - (pointer.inside && activeCfg.bulletTime ? 1 : 0)) > 0.002;

        if (isVisible && !document.hidden && (isRunning || hoverActive)) {
          animFrameId = requestAnimationFrame(onTick);
        }
      };

      const requestLoop = () => {
        if (!isDestroyed && !animFrameId && isVisible) {
          lastTime = performance.now();
          animFrameId = requestAnimationFrame(onTick);
        }
      };

      const handleResize = () => {
        const rect = container.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * clamp(configRef.current.quality ?? 1, 0.25, 1);

        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);

        const wPx = Math.round(width * pixelRatio);
        const hPx = Math.round(height * pixelRatio);

        disposeBloomTargets();
        renderTargetMain = createRenderTarget(wPx, hPx, bufferType, THREE.LinearFilter);

        const mips = clamp(Math.floor(Math.log2(Math.min(wPx, hPx) / 8)), 3, 7);
        for (let i = 1; i <= mips; i++) {
          downTargets.push(createRenderTarget(wPx >> i, hPx >> i, bufferType, THREE.LinearFilter));
          upTargets.push(createRenderTarget(wPx >> i, hPx >> i, bufferType, THREE.LinearFilter));
        }

        renderFrame();
        requestLoop();
      };

      const getEventCanvasCoords = (e: PointerEvent): [number, number] => {
        const rect = container.getBoundingClientRect();
        return [(e.clientX - rect.left) * pixelRatio, (e.clientY - rect.top) * pixelRatio];
      };

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType === "touch" || !configRef.current.interactive) return;
        const [px, py] = getEventCanvasCoords(e);
        pointer.goalX = px;
        pointer.goalY = py;
        if (!pointer.placed) {
          pointer.x = px;
          pointer.y = py;
          pointer.placed = true;
        }
        if (!pointer.inside) {
          pointer.inside = true;
          requestLoop();
        }
      };

      const onPointerLeave = () => {
        pointer.inside = false;
        pointer.placed = pointer.amount > 0.01;
        requestLoop();
      };

      const triggerBurst = (cx: number, cy: number) => {
        const cfg = configRef.current;
        if (cfg.reduced || cfg.paused) return;
        const bSize = clamp(cfg.burstSize ?? 1, 0, 3);
        if (bSize <= 0) return;

        layers.forEach((lyr, lIdx) => {
          const ang = gridUniforms.uAngle.value;
          const centerRenderX = (width * pixelRatio) / 2;
          const centerRenderY = (height * pixelRatio) / 2;
          const dx = cx - centerRenderX;
          const dy = cy - centerRenderY;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);

          const gridCol = (cosA * dx + sinA * dy + centerRenderX - lyr.originX) / lyr.cellW;
          const gridRow = (-sinA * dx + cosA * dy + centerRenderY - lyr.originY) / lyr.cellH;

          const colSpan = Math.max(1, Math.round((lIdx === 0 ? 6 : 8) * bSize));
          const centerCol = Math.floor(gridCol);

          for (let col = centerCol - colSpan; col <= centerCol + colSpan; col++) {
            if (col < 0 || col >= lyr.cols) continue;
            const dist = Math.abs(col - centerCol) / colSpan;
            if (nextRandom() > Math.exp(-dist * dist * 2.2) * (lIdx === 0 ? 0.95 : 0.6)) continue;

            const hOffset = (4 * col + 2 + 1) * 4;
            const respawnIdx = 3 * col + 2;
            if (lyr.heads[hOffset + 2] > 0.5) continue;

            const startY = gridRow - 0.5 - 1.5 * nextRandom();
            lyr.heads.set([startY, startY, 0, nextRandom()], hOffset);
            lyr.respawn[respawnIdx] = dist * colSpan * 0.045 + 0.06 * nextRandom();
          }
        });
        requestLoop();
      };

      const onPointerDown = (e: PointerEvent) => {
        const cfg = configRef.current;
        if (e.button !== 0 || !cfg.interactive || !cfg.clickBurst) return;
        const [px, py] = getEventCanvasCoords(e);
        triggerBurst(px, py);
      };

      // Window-level interactive tracking when container is a background
      const onWindowPointerMove = (e: PointerEvent) => {
        if (e.pointerType === "touch" || !configRef.current.interactive) return;
        const rect = container.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const px = (e.clientX - rect.left) * pixelRatio;
          const py = (e.clientY - rect.top) * pixelRatio;
          pointer.goalX = px;
          pointer.goalY = py;
          if (!pointer.placed) {
            pointer.x = px;
            pointer.y = py;
            pointer.placed = true;
          }
          if (!pointer.inside) {
            pointer.inside = true;
            requestLoop();
          }
        } else if (pointer.inside) {
          pointer.inside = false;
          pointer.placed = pointer.amount > 0.01;
          requestLoop();
        }
      };

      const onWindowPointerDown = (e: PointerEvent) => {
        const cfg = configRef.current;
        if (e.button !== 0 || !cfg.interactive || !cfg.clickBurst) return;
        const target = e.target as HTMLElement | null;
        if (target && target.closest('button, a, input, select, textarea, [role="button"]')) {
          return;
        }
        const rect = container.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const px = (e.clientX - rect.left) * pixelRatio;
          const py = (e.clientY - rect.top) * pixelRatio;
          triggerBurst(px, py);
        }
      };

      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
      container.addEventListener("pointercancel", onPointerLeave);
      container.addEventListener("pointerdown", onPointerDown);

      window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
      window.addEventListener("pointerdown", onWindowPointerDown, { passive: true });

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      const intersectObserver = new IntersectionObserver(
        (entries) => {
          isVisible = entries.some((entry) => entry.isIntersecting);
          if (isVisible) requestLoop();
        },
        { rootMargin: "80px" }
      );
      intersectObserver.observe(container);

      const onVisibilityChange = () => {
        if (!document.hidden) requestLoop();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      const onContextLost = (e: Event) => e.preventDefault();
      canvas.addEventListener("webglcontextlost", onContextLost);

      handleResize();

      return {
        sync: () => {
          const targetDpr = Math.min(window.devicePixelRatio || 1, 2) * clamp(configRef.current.quality ?? 1, 0.25, 1);
          if (Math.abs(targetDpr - pixelRatio) > 0.001) {
            handleResize();
          } else {
            renderFrame();
          }
          requestLoop();
        },
        destroy: () => {
          isDestroyed = true;
          cancelAnimationFrame(animFrameId);
          container.removeEventListener("pointermove", onPointerMove);
          container.removeEventListener("pointerleave", onPointerLeave);
          container.removeEventListener("pointercancel", onPointerLeave);
          container.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointermove", onWindowPointerMove);
          window.removeEventListener("pointerdown", onWindowPointerDown);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          canvas.removeEventListener("webglcontextlost", onContextLost);
          resizeObserver.disconnect();
          intersectObserver.disconnect();
          disposeBloomTargets();
          disposeLayers();
          atlasData?.texture.dispose();
          quadGeom.dispose();
          [stateMaterial, compositeMaterial, downsampleMaterial, upsampleMaterial, outputMaterial].forEach((m) =>
            m.dispose()
          );
          renderer.dispose();
          renderer.forceContextLoss();
          canvas.remove();
        },
        burst: (normX = 0.5, normY = 0.3) => {
          triggerBurst(clamp(normX, 0, 1) * width * pixelRatio, clamp(normY, 0, 1) * height * pixelRatio);
        },
      };
    })(el, propsRef);

    controllerRef.current = controller;
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      burst: (x = 0.5, y = 0.3) => controllerRef.current?.burst(x, y),
    }),
    []
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative isolate h-full min-h-[240px] w-full overflow-hidden", className)}
      style={{ backgroundColor, ...style }}
    >
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  );
});

TerminalRain.displayName = "TerminalRain";
export default TerminalRain;
