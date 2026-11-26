export interface CaesarSplashOptions {
  logoSrc: string;
  fallbackLogoSrc?: string;
  title?: string;
  subtitle?: string;
  overlay?: boolean;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

export interface CaesarSplashHandle {
  finish: () => void;
  destroy: () => void;
}

const TOTAL_DURATION_MS = 6500;
const IMAGE_TIMEOUT_MS = 10000;

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Quintic smootherstep easing: x^3 * (x * (x * 6 - 15) + 10)
 */
function smootherstep(a: number, b: number, t: number): number {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  p: number;
}

const STRAND_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], // Upper-left
  [1, -1],  // Upper-right
  [1, 1],   // Lower-right
];

const ORBIT_TILTS: ReadonlyArray<number> = [-0.65, 0.65, 1.57];

/**
 * Dependency-free TypeScript port of the approved 6.5s Canvas 2D perspective ribbon/electron splash renderer.
 */
export function createCaesarSplash(
  host: HTMLElement,
  options: CaesarSplashOptions
): CaesarSplashHandle {
  const titleText = options.title ?? 'CAESAR CENTRAL HUB';
  const subtitleText = options.subtitle ?? 'INTERNAL OPERATIONS PORTAL';
  const isOverlay = options.overlay ?? true;

  const container = document.createElement('div');
  container.className = isOverlay
    ? 'caesar-splash caesar-splash--overlay'
    : 'caesar-splash';

  const canvas = document.createElement('canvas');
  canvas.className = 'caesar-splash__canvas';
  container.appendChild(canvas);

  const identity = document.createElement('div');
  identity.className = 'caesar-splash__identity';

  const titleEl = document.createElement('h1');
  titleEl.className = 'caesar-splash__title';
  titleEl.textContent = titleText;

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'caesar-splash__subtitle';
  subtitleEl.textContent = subtitleText;

  identity.appendChild(titleEl);
  identity.appendChild(subtitleEl);
  container.appendChild(identity);
  host.appendChild(container);

  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let dpr = 1;
  let rafId: number | null = null;
  let destroyed = false;
  let completed = false;
  let startTime: number | null = null;
  let pausedAt: number | null = null;
  let accumulatedPause = 0;
  let currentElapsedSec = 0;

  let logoImg: HTMLImageElement | null = null;
  let logoReady = false;
  let triedFallback = false;

  const updateCanvasMetrics = () => {
    if (destroyed) return;
    const rect = container.getBoundingClientRect();
    W = Math.max(1, rect.width || window.innerWidth || 1);
    H = Math.max(1, rect.height || window.innerHeight || 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (startTime !== null) {
      renderFrame(currentElapsedSec);
    }
  };

  /**
   * Computes a point along strand `i` at normalized parameter `u` (0..1) and time `sec`.
   * Shared by both ribbon strands and electron head/trail geometry.
   */
  const computeStrandPoint = (
    i: number,
    u: number,
    sec: number,
    cx: number,
    cy: number,
    r: number,
    curl: number
  ): Point3D => {
    const [dx, dy] = STRAND_CORNERS[i];
    const motion = sec;

    // Straight corner path with travelling wave
    const startX = cx + dx * Math.max(W, H) * 0.72;
    const startY = cy + dy * Math.max(W, H) * 0.72;
    const endX = cx - dx * r * 0.45;
    const endY = cy - dy * r * 0.45;

    const baseLineX = lerp(startX, endX, u);
    const baseLineY = lerp(startY, endY, u);

    const len = Math.hypot(endX - startX, endY - startY) || 1;
    const nx = -(endY - startY) / len;
    const ny = (endX - startX) / len;
    const wave =
      Math.sin((1 - u) * 5 - motion * 4 + i) *
      8 *
      Math.sin(u * Math.PI) *
      (1 - curl * 0.7);

    const lineX = baseLineX + nx * wave;
    const lineY = baseLineY + ny * wave;

    // 3D tilted orbital path
    const tilt = ORBIT_TILTS[i];
    const angle = u * Math.PI * 2.15 + motion * 2.35 + i * 2.094;
    const ox = Math.cos(angle) * r;
    const oy = Math.sin(angle) * r * 0.42;
    const oz = Math.sin(angle) * r * 0.78;

    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const rotX = ox * cosT - oy * sinT;
    const rotY = ox * sinT + oy * cosT;

    const zz = lerp(0, oz, curl);
    const p = 850 / (850 - zz);

    const orbX = cx + rotX * p;
    const orbY = cy + rotY * p;

    return {
      x: lerp(lineX, orbX, curl),
      y: lerp(lineY, orbY, curl),
      z: zz,
      p,
    };
  };

  const renderFrame = (sec: number) => {
    if (destroyed || !ctx) return;

    // Always reset canvas alpha/shadow state at the start of every frame
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Fill background #090B0E
    ctx.fillStyle = '#090B0E';
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const cy = H * 0.47;
    const r = Math.min(W * 0.34, H * 0.33, 310);

    // Phase 1 & 2 (0.25s–5.20s): Ribbons, 3D Orbits, Electrons & 28-Segment Trails
    // CRITICAL INVARIANT: After 5.20s, skip orbit and electron render passes completely!
    if (sec >= 0.25 && sec < 5.2) {
      const flowIn = smootherstep(0.25, 2.0, sec);
      const curl = smootherstep(1.2, 2.6, sec);
      const fadeOut = 1 - smootherstep(4.7, 5.2, sec);

      if (fadeOut > 0.001) {
        const ribbonGrad = ctx.createLinearGradient(
          cx - r,
          cy - r,
          cx + r,
          cy + r
        );
        ribbonGrad.addColorStop(0, '#FFE66B');
        ribbonGrad.addColorStop(0.5, '#FFC23C');
        ribbonGrad.addColorStop(1, '#FF851D');

        const baseWidth = lerp(24, 2.2, smootherstep(0.25, 2.0, sec));
        const segments = 54;
        const headU = lerp(0.18, 1.0, flowIn);

        // Draw 3 perspective ribbons
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = ribbonGrad;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const tailU = Math.max(0, headU - lerp(0.55, 0.92, curl));
          let prevPt = computeStrandPoint(i, tailU, sec, cx, cy, r, curl);

          for (let s = 1; s <= segments; s++) {
            const frac = s / segments;
            const u = lerp(tailU, headU, frac);
            const pt = computeStrandPoint(i, u, sec, cx, cy, r, curl);

            const taper = Math.sin(frac * Math.PI * 0.85 + 0.15);
            ctx.lineWidth = Math.max(0.8, baseWidth * taper * pt.p);
            ctx.globalAlpha = clamp(fadeOut * (0.25 + 0.75 * frac), 0, 1);

            ctx.beginPath();
            ctx.moveTo(prevPt.x, prevPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();

            prevPt = pt;
          }
          ctx.restore();
        }

        // Draw 3 electrons and 28-segment 1px fine trails
        const electronFadeIn = smootherstep(0.25, 0.65, sec);
        const electronJoin = smootherstep(0.45, 2.6, sec);
        const electronAlpha = clamp(electronFadeIn * fadeOut, 0, 1);

        if (electronAlpha > 0.001) {
          const baseElectronRadius = lerp(3.2, 3.52, electronJoin);
          const trailSegments = 28;
          const trailSpan = 0.24;

          for (let i = 0; i < 3; i++) {
            const targetPt = computeStrandPoint(i, headU, sec, cx, cy, r, curl);
            const ex = lerp(cx, targetPt.x, electronJoin);
            const ey = lerp(cy, targetPt.y, electronJoin);
            const ep = lerp(1, targetPt.p, electronJoin);

            // 28-segment 1px fine trail sharing exact ribbon geometry
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = '#FFD265';
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';

            let prevTrailPt = { x: ex, y: ey };
            for (let tIdx = 1; tIdx <= trailSegments; tIdx++) {
              const tFrac = tIdx / trailSegments;
              const trailU = Math.max(0, headU - tFrac * trailSpan);
              const rawPt = computeStrandPoint(i, trailU, sec, cx, cy, r, curl);
              const tx = lerp(cx, rawPt.x, electronJoin);
              const ty = lerp(cy, rawPt.y, electronJoin);

              ctx.globalAlpha =
                electronAlpha * (1 - tFrac) * 0.78 * electronJoin;
              ctx.beginPath();
              ctx.moveTo(prevTrailPt.x, prevTrailPt.y);
              ctx.lineTo(tx, ty);
              ctx.stroke();

              prevTrailPt = { x: tx, y: ty };
            }
            ctx.restore();

            // Electron core (#FFF4C0) with glow (#FFBC45, shadowBlur = 10)
            ctx.save();
            ctx.globalAlpha = electronAlpha;
            ctx.shadowColor = '#FFBC45';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#FFF4C0';
            ctx.beginPath();
            ctx.arc(
              ex,
              ey,
              Math.max(1.8, baseElectronRadius * ep),
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    // Reset shadow & alpha strictly before emblem pass
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Phase 3 & 4 (2.70s–6.50s): Official Caesar Emblem at Nucleus
    const baseSize = Math.min(H * 0.59, W < 700 ? W * 0.96 : 650);
    const settledSize = baseSize * 0.9;
    const lift = smootherstep(4.1, 4.7, sec);
    const logoY = cy - lift * H * 0.065;

    if (sec >= 2.7 && logoReady && logoImg) {
      const emerge = smootherstep(2.7, 3.7, sec);
      const scaleIn = lerp(0.85, 1.0, emerge);
      const shrinkToSettled = lerp(1.0, 0.9, lift);
      const currentDrawSize = baseSize * scaleIn * shrinkToSettled;

      // Natural aspect ratio preservation
      const natW = logoImg.naturalWidth || 1;
      const natH = logoImg.naturalHeight || 1;
      const aspect = natW / natH;
      const drawW = aspect >= 1 ? currentDrawSize : currentDrawSize * aspect;
      const drawH = aspect >= 1 ? currentDrawSize / aspect : currentDrawSize;

      // CRITICAL INVARIANT: Draw emblem with shadowBlur = 0, shadowColor = 'transparent', and zero box/glow
      ctx.save();
      ctx.globalAlpha = clamp(emerge, 0, 1);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.drawImage(
        logoImg,
        cx - drawW * 0.5,
        logoY - drawH * 0.5,
        drawW,
        drawH
      );
      ctx.restore();
    }

    // Phase 5 (5.20s–5.80s): Identity Block Reveal below Emblem
    const identityTop = Math.round(logoY + settledSize * 0.44 + 16);
    identity.style.top = `${identityTop}px`;

    if (sec >= 5.2) {
      const idReveal = smootherstep(5.2, 5.8, sec);
      identity.style.opacity = String(clamp(idReveal, 0, 1));
      identity.style.transform = `translate3d(-50%, ${lerp(
        10,
        0,
        idReveal
      ).toFixed(2)}px, 0)`;
    } else {
      identity.style.opacity = '0';
      identity.style.transform = 'translate3d(-50%, 10px, 0)';
    }

    ctx.restore();
  };

  const tick = (now: number) => {
    if (destroyed || completed) return;
    if (pausedAt !== null) return;

    if (startTime === null) {
      startTime = now;
    }

    const elapsedMs = now - startTime - accumulatedPause;
    currentElapsedSec = clamp(elapsedMs / 1000, 0, TOTAL_DURATION_MS / 1000);

    renderFrame(currentElapsedSec);

    if (elapsedMs >= TOTAL_DURATION_MS) {
      completed = true;
      rafId = null;
      options.onComplete?.();
      return;
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const finish = () => {
    if (destroyed || completed) return;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    currentElapsedSec = TOTAL_DURATION_MS / 1000;
    renderFrame(currentElapsedSec);
    completed = true;
    options.onComplete?.();
  };

  const handleVisibilityChange = () => {
    if (destroyed || completed) return;
    if (document.hidden) {
      if (pausedAt === null) {
        pausedAt = performance.now();
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      if (pausedAt !== null) {
        accumulatedPause += performance.now() - pausedAt;
        pausedAt = null;
      }
      if (rafId === null && startTime !== null) {
        rafId = window.requestAnimationFrame(tick);
      }
    }
  };

  const handleWindowResize = () => {
    updateCanvasMetrics();
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasMetrics();
    });
    resizeObserver.observe(container);
  }

  window.addEventListener('resize', handleWindowResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  updateCanvasMetrics();

  // Reduced Motion Accessibility: render final frame immediately & fire finish()
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  logoImg = img;

  const loadTimeout = window.setTimeout(() => {
    if (!logoReady && !destroyed) {
      const err = new Error('Caesar splash emblem load timed out (10s).');
      options.onError?.(err);
    }
  }, IMAGE_TIMEOUT_MS);

  const startPlayback = () => {
    if (destroyed) return;
    if (prefersReducedMotion) {
      finish();
      return;
    }
    if (rafId === null) {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  img.onload = () => {
    window.clearTimeout(loadTimeout);
    if (destroyed) return;
    logoReady = true;
    startPlayback();
  };

  img.onerror = () => {
    if (destroyed) return;
    if (!triedFallback && options.fallbackLogoSrc) {
      triedFallback = true;
      img.src = options.fallbackLogoSrc;
      return;
    }
    window.clearTimeout(loadTimeout);
    options.onError?.(new Error('Failed to load Caesar splash emblem.'));
  };

  img.src = options.logoSrc;
  // Begin the timeline immediately while emblem loads in parallel
  if (!prefersReducedMotion) {
    startPlayback();
  }

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    window.clearTimeout(loadTimeout);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('resize', handleWindowResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (logoImg) {
      logoImg.onload = null;
      logoImg.onerror = null;
      logoImg = null;
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  return {
    finish,
    destroy,
  };
}
