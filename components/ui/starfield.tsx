"use client";

import styles from "./starfield.module.css";
import { useEffect, useRef, useSyncExternalStore } from "react";

type StarKind = "tiny" | "small" | "bright";

type Star = Readonly<{
  baseAlpha: number;
  color: string;
  glow: number;
  period: number;
  phase: number;
  radius: number;
  twinkle: boolean;
  x: number;
  y: number;
}>;

const SEED = 0x9e3779b9;

/** Deterministic PRNG (mulberry32) so the star layout is stable across
 * reloads instead of reshuffling every visit. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted palette: mostly white, with restrained accent hues so the field
// never reads as "colorful" rather than "a dark sky with a little color".
const PALETTE = [
  { color: "255,255,255", weight: 0.55 },
  { color: "165,140,255", weight: 0.2 },
  { color: "120,220,255", weight: 0.12 },
  { color: "120,160,255", weight: 0.08 },
  { color: "130,255,190", weight: 0.05 },
] as const;

function pickColor(random: () => number): string {
  const roll = random();
  let cumulative = 0;
  for (const entry of PALETTE) {
    cumulative += entry.weight;
    if (roll <= cumulative) return entry.color;
  }
  return PALETTE[0].color;
}

function buildPool(count: number, random: () => number, kind: StarKind): readonly Star[] {
  const stars: Star[] = [];
  for (let index = 0; index < count; index += 1) {
    const radius = kind === "tiny" ? 0.45 + random() * 0.45 : kind === "small" ? 0.8 + random() * 0.85 : 1.6 + random() * 1.6;
    // A wider slice of "small" stars now carries a soft glow, and bright
    // stars glow harder, per the "一部の星には強めの発光" ask.
    const glow = kind === "bright" ? 10 + random() * 12 : kind === "small" && random() < 0.5 ? 2.5 + random() * 4 : 0;
    // More stars twinkle now, and more strongly ("ピカピカ"): see the
    // amplitude bump in the twinkle formula in drawLayer.
    const twinkleChance = kind === "bright" ? 0.8 : kind === "small" ? 0.55 : 0.25;
    stars.push({
      baseAlpha: kind === "tiny" ? 0.32 + random() * 0.32 : kind === "small" ? 0.5 + random() * 0.4 : 0.75 + random() * 0.25,
      color: pickColor(random),
      glow,
      period: 2.5 + random() * 4.5,
      phase: random() * Math.PI * 2,
      radius,
      twinkle: random() < twinkleChance,
      x: random(),
      y: random(),
    });
  }
  return stars;
}

const seededRandom = mulberry32(SEED);
// Denser pools for a "満天の星空" (sky-full-of-stars) feel; still cheap to
// redraw (a few hundred circles) at the throttled frame rate below.
const TINY_POOL = buildPool(420, seededRandom, "tiny");
const SMALL_POOL = buildPool(150, seededRandom, "small");
const BRIGHT_POOL = buildPool(26, seededRandom, "bright");

/** Fades stars slightly near the viewport center, where reading content
 * lives, while keeping a visibility floor so the sky still reads clearly
 * behind/around text and over bright card surfaces
 * ("明るい場所でも星が見える程度の視認性"). */
function centerDistanceFactor(normalizedX: number, normalizedY: number): number {
  const dx = normalizedX - 0.5;
  const dy = normalizedY - 0.5;
  const distance = Math.min(1, Math.max(0, Math.sqrt(dx * dx + dy * dy) / 0.5));
  return 0.6 + 0.4 * distance ** 1.4;
}

/**
 * Paints a deep-space backdrop — a soft vignette, a diagonal Milky Way
 * band, and a couple of faint nebula blobs — into an offscreen canvas.
 * This is static per viewport size (no twinkle/parallax of its own), so it
 * is rendered once on resize rather than every animation frame; the main
 * loop just blits it back with `drawImage`, which is effectively free.
 */
function paintBackdrop(target: HTMLCanvasElement, width: number, height: number, dpr: number, random: () => number): void {
  target.width = Math.max(1, Math.floor(width * dpr));
  target.height = Math.max(1, Math.floor(height * dpr));
  const ctx = target.getContext("2d");
  if (ctx === null) return;
  const w = target.width;
  const h = target.height;

  // Base night-sky vignette: near-black at the corners, a touch of deep
  // indigo toward the center so the field doesn't read as flat/void.
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "#0c0b1f");
  vignette.addColorStop(0.55, "#07070f");
  vignette.addColorStop(1, "#020205");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Milky Way: a soft diagonal band built from overlapping, elongated
  // radial-gradient "puffs" along a line, composited with `lighter` so
  // overlaps brighten naturally like a real dust cloud instead of forming
  // visible hard-edged ellipses.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const angle = -0.34; // radians; a gentle diagonal sweep across the sky
  const bandLength = Math.hypot(w, h) * 1.3;
  const originX = w * 0.15;
  const originY = h * 0.92;
  const steps = 46;
  for (let index = 0; index < steps; index += 1) {
    const t = index / (steps - 1);
    const along = t * bandLength;
    const cx = originX + Math.cos(angle) * along;
    const cy = originY + Math.sin(angle) * along;
    const jitter = (random() - 0.5) * h * 0.05;
    const perpAngle = angle + Math.PI / 2;
    const px = cx + Math.cos(perpAngle) * jitter;
    const py = cy + Math.sin(perpAngle) * jitter;
    const puffRadius = h * (0.16 + random() * 0.1);
    const puff = ctx.createRadialGradient(px, py, 0, px, py, puffRadius);
    const hueMix = random();
    const core = hueMix < 0.5 ? "180,170,255" : "150,210,255";
    puff.addColorStop(0, `rgba(${core},0.05)`);
    puff.addColorStop(0.5, `rgba(${core},0.025)`);
    puff.addColorStop(1, "rgba(140,150,255,0)");
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.ellipse(px, py, puffRadius * 1.5, puffRadius * 0.5, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  // A fine dust of extra micro-stars concentrated inside the band gives it
  // texture up close, not just a smooth glow.
  for (let index = 0; index < 900; index += 1) {
    const t = random();
    const along = t * bandLength;
    const spread = (random() - 0.5) * h * 0.22 * (0.3 + Math.sin(t * Math.PI));
    const cx = originX + Math.cos(angle) * along + Math.cos(angle + Math.PI / 2) * spread;
    const cy = originY + Math.sin(angle) * along + Math.sin(angle + Math.PI / 2) * spread;
    if (cx < -20 || cx > w + 20 || cy < -20 || cy > h + 20) continue;
    const r = 0.3 + random() * 0.6;
    ctx.fillStyle = `rgba(235,230,255,${(0.06 + random() * 0.14).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // A couple of low, colorful nebula blobs tucked into corners — the
  // "original element" flourish, kept faint enough not to compete with
  // foreground text or cards.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const nebulae: ReadonlyArray<readonly [number, number, string]> = [
    [0.08, 0.12, "124,92,255"],
    [0.92, 0.2, "94,234,212"],
    [0.85, 0.88, "90,166,255"],
  ];
  for (const [nx, ny, rgb] of nebulae) {
    const cx = w * nx;
    const cy = h * ny;
    const radius = Math.max(w, h) * (0.22 + random() * 0.08);
    const blob = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    blob.addColorStop(0, `rgba(${rgb},0.07)`);
    blob.addColorStop(0.6, `rgba(${rgb},0.03)`);
    blob.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function subscribeThemeAttribute(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"], attributes: true });
  return () => observer.disconnect();
}

function readIsNeonTheme(): boolean {
  return document.documentElement.dataset.theme === "neon";
}

function serverIsNeonTheme(): boolean {
  return false;
}

/**
 * Canvas-based starfield background for the Neon theme only. Fixed,
 * pointer-events: none, and drawn behind all app content (see the
 * The component-local starfield rule keeps the canvas behind content. Positions are
 * generated once from a fixed seed so the layout stays stable across
 * reloads; every star then drifts left at a slow, constant, time-based
 * rate (no scroll tracking) so the sky feels alive without depending on
 * page scroll position.
 */
export function Starfield() {
  const isNeon = useSyncExternalStore(subscribeThemeAttribute, readIsNeonTheme, serverIsNeonTheme);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isNeon) return;
    const canvasEl = canvasRef.current;
    if (canvasEl === null) return;
    const contextEl = canvasEl.getContext("2d");
    if (contextEl === null) return;
    // Re-bind to freshly-typed (non-nullable) consts: TS narrows `canvasEl`/
    // `contextEl` themselves after the guards above, but that narrowing
    // does not propagate into the nested function declarations below since
    // they may run after this closure returns. Assigning to `canvas`/
    // `context` here gives those closures variables whose *declared* type
    // is already non-nullable, without needing control-flow narrowing.
    const canvas: HTMLCanvasElement = canvasEl;
    const context: CanvasRenderingContext2D = contextEl;
    const backdrop = document.createElement("canvas");
    const backdropSeed = mulberry32(SEED ^ 0x2545f491);

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animate = !reducedMotionQuery.matches;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Constant leftward drift, independent of scrolling: each depth layer
    // creeps left at its own steady speed (far/tiny stars slowest,
    // near/bright stars fastest) and wraps modulo the viewport width so
    // the field loops seamlessly instead of running out.
    function drawLayer(stars: readonly Star[], time: number, driftPxPerSec: number): void {
      const widthPx = width * dpr;
      const drift = ((time / 1000) * driftPxPerSec * dpr) % widthPx;
      const wrappedShift = ((-drift % widthPx) + widthPx) % widthPx;
      for (const star of stars) {
        let alpha = star.baseAlpha * centerDistanceFactor(star.x, star.y) * 2.5;
        if (star.twinkle) {
          const wave = Math.sin(((time / 1000 / star.period) * Math.PI * 2) + star.phase);
          // Wider swing (was 0.55 + 0.45) for a more noticeable "ピカピカ"
          // sparkle rather than a gentle fade.
          alpha *= 0.3 + 0.7 * ((wave + 1) / 2);
        }
        const clampedAlpha = Math.min(1, Math.max(0, alpha));
        context.beginPath();
        context.fillStyle = `rgba(${star.color},${clampedAlpha.toFixed(3)})`;
        if (star.glow > 0) {
          context.shadowBlur = star.glow * dpr;
          context.shadowColor = `rgba(${star.color},${Math.min(0.7, clampedAlpha).toFixed(3)})`;
        } else {
          context.shadowBlur = 0;
        }
        const x = (((star.x * widthPx + wrappedShift) % widthPx) + widthPx) % widthPx;
        context.arc(x, star.y * height * dpr, star.radius * dpr, 0, Math.PI * 2);
        context.fill();
      }
    }

    function draw(time: number): void {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(backdrop, 0, 0);
      const areaFactor = Math.min(1.3, Math.max(0.35, (width * height) / (1440 * 900)));
      drawLayer(TINY_POOL.slice(0, Math.floor(TINY_POOL.length * areaFactor)), time, 1.5);
      drawLayer(SMALL_POOL.slice(0, Math.floor(SMALL_POOL.length * areaFactor)), time, 3.5);
      drawLayer(BRIGHT_POOL, time, 6);
    }

    function resize(): void {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      paintBackdrop(backdrop, width, height, dpr, backdropSeed);
      draw(0);
    }

    resize();
    window.addEventListener("resize", resize);

    let frameId: number | undefined;
    let lastFrameTime = 0;
    // Redraws are throttled to ~24fps; the whole pool is a few hundred
    // circles at most, so a full redraw per tick is cheap and avoids any
    // per-star DOM/state bookkeeping.
    function loop(time: number): void {
      if (time - lastFrameTime > 1000 / 24) {
        lastFrameTime = time;
        draw(time);
      }
      frameId = window.requestAnimationFrame(loop);
    }
    if (animate) frameId = window.requestAnimationFrame(loop);

    function handleMotionChange(event: MediaQueryListEvent): void {
      animate = !event.matches;
      if (!animate && frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
        frameId = undefined;
        draw(0);
      } else if (animate && frameId === undefined) {
        frameId = window.requestAnimationFrame(loop);
      }
    }
    reducedMotionQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", resize);
      reducedMotionQuery.removeEventListener("change", handleMotionChange);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, [isNeon]);

  if (!isNeon) return null;

  return <canvas aria-hidden className={styles.starfield!} ref={canvasRef} />;
}
