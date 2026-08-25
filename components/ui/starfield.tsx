"use client";

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
    const radius = kind === "tiny" ? 0.4 + random() * 0.4 : kind === "small" ? 0.7 + random() * 0.7 : 1.4 + random() * 1.2;
    const glow = kind === "bright" ? 6 + random() * 6 : kind === "small" && random() < 0.3 ? 2 + random() * 2 : 0;
    const twinkleChance = kind === "bright" ? 0.6 : kind === "small" ? 0.3 : 0.08;
    stars.push({
      baseAlpha: kind === "tiny" ? 0.15 + random() * 0.25 : kind === "small" ? 0.3 + random() * 0.35 : 0.55 + random() * 0.35,
      color: pickColor(random),
      glow,
      period: 4 + random() * 6,
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
const TINY_POOL = buildPool(260, seededRandom, "tiny");
const SMALL_POOL = buildPool(90, seededRandom, "small");
const BRIGHT_POOL = buildPool(14, seededRandom, "bright");

/** Fades stars out near the viewport center, where reading content lives,
 * and lets them read clearly toward the edges/gaps. */
function centerDistanceFactor(normalizedX: number, normalizedY: number): number {
  const dx = normalizedX - 0.5;
  const dy = normalizedY - 0.5;
  const distance = Math.min(1, Math.max(0, Math.sqrt(dx * dx + dy * dy) / 0.5));
  return 0.25 + 0.75 * distance ** 1.4;
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
 * `.ui-starfield { z-index: -1 }` rule in globals.css). Positions are
 * generated once from a fixed seed so the layout stays stable across
 * reloads; per-frame work only recomputes opacity for a small twinkling
 * subset, never DOM/layout.
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

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animate = !reducedMotionQuery.matches;
    let width = 0;
    let height = 0;
    let dpr = 1;

    function drawLayer(stars: readonly Star[], time: number): void {
      for (const star of stars) {
        let alpha = star.baseAlpha * centerDistanceFactor(star.x, star.y);
        if (star.twinkle) {
          const wave = Math.sin(((time / 1000 / star.period) * Math.PI * 2) + star.phase);
          alpha *= 0.55 + 0.45 * ((wave + 1) / 2);
        }
        const clampedAlpha = Math.min(1, Math.max(0, alpha));
        context.beginPath();
        context.fillStyle = `rgba(${star.color},${clampedAlpha.toFixed(3)})`;
        if (star.glow > 0) {
          context.shadowBlur = star.glow * dpr;
          context.shadowColor = `rgba(${star.color},${Math.min(0.6, clampedAlpha).toFixed(3)})`;
        } else {
          context.shadowBlur = 0;
        }
        context.arc(star.x * width * dpr, star.y * height * dpr, star.radius * dpr, 0, Math.PI * 2);
        context.fill();
      }
    }

    function draw(time: number): void {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const areaFactor = Math.min(1.3, Math.max(0.35, (width * height) / (1440 * 900)));
      drawLayer(TINY_POOL.slice(0, Math.floor(TINY_POOL.length * areaFactor)), time);
      drawLayer(SMALL_POOL.slice(0, Math.floor(SMALL_POOL.length * areaFactor)), time);
      drawLayer(BRIGHT_POOL, time);
    }

    function resize(): void {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
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

  return <canvas aria-hidden className="ui-starfield pointer-events-none fixed inset-0" ref={canvasRef} />;
}