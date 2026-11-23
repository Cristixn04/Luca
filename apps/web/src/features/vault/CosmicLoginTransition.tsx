import { memo, useEffect, useRef } from 'react';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';
import { LucaBrandLogo } from '@/components/layout/LucaBrandLogo';

export interface CosmicLoginTransitionProps {
  onComplete: () => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_IN_OUT_STRONG: [number, number, number, number] = [0.77, 0, 0.175, 1];

const TOTAL_DURATION_MS = 3050;
const REDUCED_DURATION_MS = 240;

interface Vec2 {
  readonly x: number;
  readonly y: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  twinklePhase: number;
  twinkleSpeed: number;
  warm: boolean;
}

interface RingParticle {
  angle: number;
  rx: number;
  ry: number;
  tilt: number;
  speed: number;
  expandRate: number;
  size: number;
  twinklePhase: number;
  driftY: number;
}

// Trayectoria en espiral S del cometa (coordenadas normalizadas 0..1 del viewport, fiel al video)
const COMET_WAYPOINTS: readonly Vec2[] = [
  { x: 0.50, y: 0.61 }, // Nace del botón Continuar
  { x: 0.62, y: 0.70 }, // Curva inicial de impulso
  { x: 0.25, y: 0.89 }, // Barrido inferior izquierdo
  { x: 0.43, y: 0.62 }, // Ascenso diagonal por constelaciones
  { x: 0.56, y: 0.45 }, // Cima del primer arco
  { x: 0.42, y: 0.42 }, // Gancho hacia la izquierda
  { x: 0.29, y: 0.56 }, // Curva media izquierda
  { x: 0.37, y: 0.38 }, // Subida hacia el portal entrante
  { x: 0.67, y: 0.46 }, // Cruce luminoso a la derecha
  { x: 0.49, y: 0.59 }, // Giro envolvente por la base
  { x: 0.21, y: 0.34 }, // Envoltura por el borde izquierdo
  { x: 0.31, y: 0.21 }, // Paso sobre el encabezado superior
  { x: 0.52, y: 0.19 }, // Disipación final hacia el centro superior
];

function sampleCatmullRom(points: readonly Vec2[], tNorm: number): Vec2 {
  const clamped = Math.max(0, Math.min(1, tNorm));
  const segCount = points.length - 1;
  const scaled = clamped * segCount;
  const i = Math.min(segCount - 1, Math.floor(scaled));
  const u = scaled - i;

  const p0 = points[Math.max(0, i - 1)]!;
  const p1 = points[i]!;
  const p2 = points[Math.min(segCount, i + 1)]!;
  const p3 = points[Math.min(segCount, i + 2)]!;

  const u2 = u * u;
  const u3 = u2 * u;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * u +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * u +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);

  return { x, y };
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Constelaciones del cielo superior que descienden al elevarse la cámara (espacio 1440×1800)
const SKY_BAND_CONSTELLATIONS: readonly {
  id: string;
  stars: readonly Vec2[];
  edges: readonly (readonly [number, number])[];
}[] = [
  {
    id: 'upper-left-web',
    stars: [
      { x: 112, y: 210 },
      { x: 248, y: 150 },
      { x: 422, y: 245 },
      { x: 540, y: 196 },
      { x: 356, y: 360 },
      { x: 184, y: 320 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [5, 0],
      [1, 4],
    ],
  },
  {
    id: 'upper-right-crown',
    stars: [
      { x: 820, y: 250 },
      { x: 960, y: 185 },
      { x: 1110, y: 265 },
      { x: 1275, y: 170 },
      { x: 1380, y: 290 },
      { x: 1190, y: 410 },
      { x: 1020, y: 370 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 2],
    ],
  },
  {
    id: 'mid-left-dipper',
    stars: [
      { x: 78, y: 740 },
      { x: 210, y: 690 },
      { x: 326, y: 770 },
      { x: 472, y: 720 },
      { x: 386, y: 920 },
      { x: 240, y: 890 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5],
      [5, 1],
    ],
  },
  {
    id: 'mid-right-orion',
    stars: [
      { x: 860, y: 690 },
      { x: 1010, y: 640 },
      { x: 1060, y: 760 },
      { x: 1230, y: 700 },
      { x: 1360, y: 820 },
      { x: 1190, y: 910 },
      { x: 980, y: 860 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 2],
    ],
  },
  {
    id: 'lower-left-frame',
    stars: [
      { x: 110, y: 1280 },
      { x: 290, y: 1340 },
      { x: 430, y: 1260 },
      { x: 340, y: 1470 },
      { x: 170, y: 1450 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
    ],
  },
  {
    id: 'lower-right-frame',
    stars: [
      { x: 1050, y: 1240 },
      { x: 1210, y: 1190 },
      { x: 1340, y: 1320 },
      { x: 1180, y: 1440 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
];

// Estelas verticales finas que enfatizan el ascenso rápido por el firmamento
const VELOCITY_STREAKS: readonly { x: number; y: number; len: number; opacity: number }[] = [
  { x: 176, y: 260, len: 140, opacity: 0.32 },
  { x: 436, y: 310, len: 180, opacity: 0.38 },
  { x: 642, y: 180, len: 165, opacity: 0.28 },
  { x: 794, y: 420, len: 190, opacity: 0.34 },
  { x: 984, y: 240, len: 155, opacity: 0.30 },
  { x: 1216, y: 480, len: 175, opacity: 0.34 },
  { x: 298, y: 820, len: 160, opacity: 0.32 },
  { x: 562, y: 740, len: 185, opacity: 0.36 },
  { x: 892, y: 890, len: 170, opacity: 0.30 },
  { x: 1148, y: 820, len: 150, opacity: 0.28 },
];

// Campo estelar determinista para el firmamento que desciende durante el ascenso de cámara
function buildSkyBandStars(count: number): readonly { x: number; y: number; r: number; o: number }[] {
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  let s = 73151;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.round(next() * 14400) / 10,
      y: Math.round(next() * 18000) / 10,
      r: 0.65 + next() * 1.45,
      o: 0.25 + next() * 0.68,
    });
  }
  return stars;
}

const SKY_BAND_STARS = buildSkyBandStars(150);

export const CosmicLoginTransition = memo(function CosmicLoginTransition({
  onComplete,
}: CosmicLoginTransitionProps) {
  const shouldReduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (shouldReduceMotion) {
      const timer = window.setTimeout(() => onCompleteRef.current(), REDUCED_DURATION_MS);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (!canvas || isJsdom) {
      const fallbackTimer = window.setTimeout(() => onCompleteRef.current(), TOTAL_DURATION_MS);
      return () => window.clearTimeout(fallbackTimer);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallbackTimer = window.setTimeout(() => onCompleteRef.current(), TOTAL_DURATION_MS);
      return () => window.clearTimeout(fallbackTimer);
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Generador pseudoaleatorio determinista para anillos de polvo estelar
    let seed = 918273;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Dos anillos elípticos concéntricos alrededor del botón Continuar (Fase 1)
    const ringParticles: RingParticle[] = [];
    const baseRx = Math.min(width * 0.36, 255);
    for (let i = 0; i < 104; i += 1) {
      const outerRing = i >= 52;
      ringParticles.push({
        angle: ((i % 52) / 52) * Math.PI * 2 + (rand() - 0.5) * 0.14,
        rx: baseRx * (outerRing ? 1.18 : 0.92) + (rand() - 0.5) * 18,
        ry: (outerRing ? 74 : 50) + (rand() - 0.5) * 14,
        tilt: outerRing ? -0.08 : 0.05,
        speed: (outerRing ? 0.65 : -0.82) * (0.85 + rand() * 0.3),
        expandRate: 0.45 + rand() * 0.65,
        size: 1.1 + rand() * 2.2,
        twinklePhase: rand() * Math.PI * 2,
        driftY: (rand() - 0.5) * 28,
      });
    }

    // Chispas que se desprenden del formulario y luego de la estela del cometa
    const sparks: SparkParticle[] = [];
    const originX = width * 0.5;
    const originY = height * 0.58;
    for (let i = 0; i < 56; i += 1) {
      const spreadX = (rand() - 0.5) * Math.min(width * 0.56, 440);
      const spreadY = (rand() - 0.5) * 115;
      sparks.push({
        x: originX + spreadX,
        y: originY + spreadY,
        vx: (rand() - 0.5) * 65 + spreadX * 0.25,
        vy: -32 - rand() * 68,
        size: 0.9 + rand() * 2.1,
        alpha: 0.75 + rand() * 0.25,
        life: 0,
        maxLife: 0.55 + rand() * 0.55,
        twinklePhase: rand() * Math.PI * 2,
        twinkleSpeed: 9 + rand() * 8,
        warm: rand() < 0.25,
      });
    }

    const startTime = performance.now();
    let lastTime = startTime;
    let rafId = 0;
    let completed = false;

    const drawFourPointGlint = (x: number, y: number, radius: number, alpha: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.45);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.32, 'rgba(220, 238, 255, 0.58)');
      grad.addColorStop(1, 'rgba(180, 214, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x - radius * 1.5, y);
      ctx.lineTo(x + radius * 1.5, y);
      ctx.moveTo(x, y - radius * 1.5);
      ctx.lineTo(x, y + radius * 1.5);
      ctx.stroke();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      const elapsedMs = now - startTime;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      if (elapsedMs >= TOTAL_DURATION_MS) {
        ctx.clearRect(0, 0, width, height);
        if (!completed) {
          completed = true;
          onCompleteRef.current();
        }
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const cx = width * 0.5;
      const buttonCy = height * 0.61;

      // 1) Anillos elípticos de polvo estelar alrededor de Continuar (0ms -> 1050ms)
      if (elapsedMs < 1050) {
        const p = elapsedMs / 1050;
        const ringFadeIn = Math.min(1, elapsedMs / 150);
        const ringFadeOut = p > 0.45 ? Math.max(0, 1 - (p - 0.45) / 0.55) : 1;
        const ringAlpha = ringFadeIn * ringFadeOut;
        // Desplazamiento descendente al iniciar el ascenso de cámara
        const cameraDropY = p > 0.38 ? Math.pow((p - 0.38) / 0.62, 2) * height * 0.36 : 0;

        for (let i = 0; i < ringParticles.length; i += 1) {
          const rp = ringParticles[i]!;
          const expand = 0.58 + p * (0.95 + rp.expandRate * 0.65);
          const theta = rp.angle + p * rp.speed * 1.4;
          const lx = Math.cos(theta) * rp.rx * expand;
          const ly = Math.sin(theta) * rp.ry * expand;
          const cosT = Math.cos(rp.tilt);
          const sinT = Math.sin(rp.tilt);
          const px = cx + lx * cosT - ly * sinT;
          const py = buttonCy + lx * sinT + ly * cosT + rp.driftY * p + cameraDropY;

          const twinkle = 0.62 + 0.38 * Math.sin(rp.twinklePhase + elapsedMs * 0.015);
          const a = ringAlpha * twinkle;
          if (a <= 0.01) continue;

          const glow = ctx.createRadialGradient(px, py, 0, px, py, rp.size * 3.4);
          glow.addColorStop(0, `rgba(255, 255, 255, ${a})`);
          glow.addColorStop(0.45, `rgba(210, 230, 255, ${a * 0.52})`);
          glow.addColorStop(1, 'rgba(180, 210, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, rp.size * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2) Vuelo del cometa luminoso S-spiral y giro orbital sobre la web (360ms -> 2520ms)
      // Muestreo analítico denso sobre la curva Catmull-Rom: cinta 100 % sedosa sin facetas a cualquier FPS
      const cometStart = 360;
      const cometEnd = 2520;
      if (elapsedMs >= cometStart && elapsedMs <= cometEnd) {
        const rawT = (elapsedMs - cometStart) / (cometEnd - cometStart);
        const headT = easeInOutCubic(Math.min(1, rawT / 0.88));
        const tailLag = 0.24;
        const tailT =
          rawT <= 0.88
            ? Math.max(0, headT - tailLag)
            : Math.min(1, 1 - tailLag * Math.max(0, 1 - (rawT - 0.88) / 0.12));

        const samples = 58;
        const ribbonFade =
          rawT < 0.06 ? rawT / 0.06 : rawT > 0.86 ? Math.max(0, 1 - (rawT - 0.86) / 0.14) : 1;

        if (headT > tailT + 0.002) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          let prevPt = sampleCatmullRom(COMET_WAYPOINTS, tailT);
          let prevX = prevPt.x * width;
          let prevY = prevPt.y * height;

          for (let i = 1; i <= samples; i += 1) {
            const frac = i / samples;
            const sampleT = tailT + (headT - tailT) * frac;
            const pt = sampleCatmullRom(COMET_WAYPOINTS, sampleT);
            const curX = pt.x * width;
            const curY = pt.y * height;

            const intensity = frac * ribbonFade;
            if (intensity > 0.015) {
              // Halo externo atmosférico
              ctx.strokeStyle = `rgba(195, 224, 255, ${intensity * intensity * 0.26})`;
              ctx.lineWidth = 1.4 + intensity * 10.0;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(curX, curY);
              ctx.stroke();

              // Resplandor plateado intermedio
              ctx.strokeStyle = `rgba(235, 245, 255, ${intensity * 0.62})`;
              ctx.lineWidth = 0.8 + intensity * 4.4;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(curX, curY);
              ctx.stroke();

              // Filamento central blanco puro
              ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.98})`;
              ctx.lineWidth = 0.4 + intensity * 2.2;
              ctx.beginPath();
              ctx.moveTo(prevX, prevY);
              ctx.lineTo(curX, curY);
              ctx.stroke();
            }

            prevPt = pt;
            prevX = curX;
            prevY = curY;
          }

          // Cabeza estelar orientada al vector tangente + destello de 4 puntas
          const headX = prevX;
          const headY = prevY;
          const tangentBefore = sampleCatmullRom(COMET_WAYPOINTS, Math.max(0, headT - 0.012));
          const angle = Math.atan2(
            (prevPt.y - tangentBefore.y) * height,
            (prevPt.x - tangentBefore.x) * width,
          );

          const headFade =
            rawT < 0.08 ? rawT / 0.08 : rawT > 0.84 ? Math.max(0, 1 - (rawT - 0.84) / 0.16) : 1;
          drawFourPointGlint(headX, headY, 10, headFade * 0.96);

          ctx.save();
          ctx.translate(headX, headY);
          ctx.rotate(angle);
          ctx.globalAlpha = headFade * 0.94;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.lineTo(-4.5, -3.4);
          ctx.lineTo(-1.5, 0);
          ctx.lineTo(-4.5, 3.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          // Emitir polvo estelar suave a lo largo de la estela reciente
          if (rawT < 0.92) {
            const emitCount = rawT > 0.82 ? 1 : 3;
            for (let k = 0; k < emitCount; k += 1) {
              const emitT = Math.max(tailT, headT - rand() * 0.08);
              const emitPos = sampleCatmullRom(COMET_WAYPOINTS, emitT);
              sparks.push({
                x: emitPos.x * width + (rand() - 0.5) * 20,
                y: emitPos.y * height + (rand() - 0.5) * 20,
                vx: (rand() - 0.5) * 42,
                vy: 12 + rand() * 34,
                size: 0.85 + rand() * 2.0,
                alpha: 0.78 + rand() * 0.22,
                life: 0,
                maxLife: 0.65 + rand() * 0.65,
                twinklePhase: rand() * Math.PI * 2,
                twinkleSpeed: 7 + rand() * 7,
                warm: rand() < 0.3,
              });
            }
          }
        }
      }

      // 3) Actualizar y dibujar todas las chispas de polvo estelar flotante
      const globalTailFade =
        elapsedMs > 2550 ? Math.max(0, 1 - (elapsedMs - 2550) / (TOTAL_DURATION_MS - 2550)) : 1;

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i]!;
        s.life += dt;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.985;
        s.vy *= 0.985;

        const norm = s.life / s.maxLife;
        const fade = norm < 0.15 ? norm / 0.15 : 1 - (norm - 0.15) / 0.85;
        const twinkle = 0.55 + 0.45 * Math.sin(s.twinklePhase + s.life * s.twinkleSpeed);
        const a = s.alpha * fade * twinkle * globalTailFade;
        if (a <= 0.01) continue;

        const r = s.size * (1 - norm * 0.35);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.5);
        g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
        g.addColorStop(
          0.45,
          s.warm ? `rgba(255, 240, 215, ${a * 0.55})` : `rgba(212, 232, 255, ${a * 0.55})`,
        );
        g.addColorStop(1, 'rgba(200, 224, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <motion.div
        aria-hidden="true"
        data-testid="cosmic-login-transition"
        className="pointer-events-none fixed inset-0 z-[100] bg-[#05070B]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden="true"
        data-testid="cosmic-login-transition"
        className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      >
        {/* 1. Cortina nocturna y neblina celeste que se disuelven revelando la web real */}
        <motion.div
          className="absolute inset-0 bg-[#05070B]"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{
            duration: 2.55,
            times: [0, 0.58, 1],
            ease: EASE_OUT_EXPO,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(64% 56% at 50% 44%, rgba(30, 38, 54, 0.58) 0%, rgba(12, 16, 24, 0.88) 54%, rgba(4, 6, 10, 1) 100%)',
            }}
          />
          {/* Sutil neblina ámbar/plateada de espacio profundo (fiel al video) */}
          <div
            className="absolute inset-0 opacity-75"
            style={{
              background:
                'radial-gradient(36% 28% at 24% 68%, rgba(168, 134, 98, 0.12) 0%, transparent 72%), radial-gradient(38% 30% at 72% 34%, rgba(152, 128, 106, 0.11) 0%, transparent 72%)',
            }}
          />
        </motion.div>

        {/* 2. Firmamento de constelaciones ascendiendo (se desplaza hacia abajo = cámara volando hacia arriba) */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[200vh]"
          initial={{ y: '-94vh', opacity: 0.92 }}
          animate={{ y: '28vh', opacity: [0.92, 0.96, 0] }}
          transition={{
            y: { duration: 2.35, delay: 0.24, ease: EASE_IN_OUT_STRONG },
            opacity: { duration: 2.45, times: [0, 0.64, 1], ease: EASE_OUT_EXPO },
          }}
        >
          <svg
            viewBox="0 0 1440 1800"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full"
          >
            <defs>
              <radialGradient id="luca-tx-star-halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
                <stop offset="40%" stopColor="#D6E6FF" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#D6E6FF" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="luca-tx-streak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="65%" stopColor="#DCEBFF" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Estrellas puntuales del firmamento en ascenso */}
            {SKY_BAND_STARS.map((st, idx) => (
              <circle
                key={`sky-star-${idx}`}
                cx={st.x}
                cy={st.y}
                r={st.r}
                fill="#F4F8FF"
                fillOpacity={st.o}
              />
            ))}

            {/* Estelas verticales de velocidad celeste */}
            {VELOCITY_STREAKS.map((st, idx) => (
              <g key={`streak-${idx}`} opacity={st.opacity}>
                <line
                  x1={st.x}
                  y1={st.y}
                  x2={st.x}
                  y2={st.y + st.len}
                  stroke="url(#luca-tx-streak)"
                  strokeWidth="1.05"
                />
                <circle cx={st.x} cy={st.y + st.len} r={2} fill="#FFFFFF" />
              </g>
            ))}

            {/* Redes de constelaciones superiores */}
            {SKY_BAND_CONSTELLATIONS.map((c) => (
              <g key={c.id}>
                {c.edges.map(([aIdx, bIdx], edgeIdx) => {
                  const a = c.stars[aIdx];
                  const b = c.stars[bIdx];
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`${c.id}-e-${edgeIdx}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#DCE8FF"
                      strokeWidth="0.95"
                      strokeOpacity="0.34"
                    />
                  );
                })}
                {c.stars.map((s, sIdx) => (
                  <g key={`${c.id}-s-${sIdx}`}>
                    <circle cx={s.x} cy={s.y} r={8.5} fill="url(#luca-tx-star-halo)" />
                    <circle cx={s.x} cy={s.y} r={2.2} fill="#FFFFFF" />
                  </g>
                ))}
              </g>
            ))}
          </svg>
        </motion.div>

        {/* 3. Escena de despedida del login (ignición del botón + descenso de logo y campos al despegar la cámara) */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-5"
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: '56vh', opacity: [1, 1, 0], scale: 0.96 }}
          transition={{
            y: { duration: 0.92, delay: 0.42, ease: EASE_IN_OUT_STRONG },
            opacity: { duration: 1.08, delay: 0.2, times: [0, 0.45, 1], ease: EASE_OUT_EXPO },
            scale: { duration: 0.9, delay: 0.42, ease: EASE_IN_OUT_STRONG },
          }}
        >
          <div className="flex w-full max-w-[440px] flex-col items-center">
            <div className="mb-10 flex items-center justify-center">
              <LucaBrandLogo className="h-auto w-[min(78vw,396px)] text-white luca-login-logo-glow" />
            </div>

            {/* Campo pill disolviéndose en polvo estelar */}
            <motion.div
              className="luca-login-pill-shell flex h-[58px] w-full items-center px-5"
              initial={{ opacity: 0.95, scale: 1 }}
              animate={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.46, delay: 0.14, ease: EASE_OUT_EXPO }}
            >
              <span className="luca-login-flare-top" />
              <span className="luca-login-flare-bottom" />
              <span className="ml-8 tracking-[0.26em] text-sm text-white/75">••••••••••</span>
            </motion.div>

            {/* Botón Continuar en ignición luminosa + destello anamórfico horizontal */}
            <div className="relative mt-5 flex w-full items-center justify-center">
              {/* Destello anamórfico horizontal */}
              <motion.div
                className="pointer-events-none absolute h-[3px] w-[135vw] rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(215, 234, 255, 0.35) 24%, rgba(255, 255, 255, 0.98) 50%, rgba(215, 234, 255, 0.35) 76%, transparent 100%)',
                  boxShadow:
                    '0 0 28px 6px rgba(220, 238, 255, 0.65), 0 0 64px 12px rgba(255, 255, 255, 0.32)',
                }}
                initial={{ scaleX: 0.16, opacity: 0 }}
                animate={{ scaleX: [0.16, 1.35, 1.8], opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.64,
                  times: [0, 0.34, 1],
                  ease: EASE_OUT_EXPO,
                }}
              />

              <motion.div
                className="luca-login-cta flex h-[58px] w-full items-center justify-center text-[17px] font-medium"
                initial={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
                animate={{
                  scale: [1, 1.035, 0.96],
                  opacity: [1, 1, 0],
                  filter: ['brightness(1)', 'brightness(1.38)', 'brightness(1.5)'],
                }}
                transition={{
                  duration: 0.56,
                  times: [0, 0.32, 1],
                  ease: EASE_OUT_EXPO,
                }}
              >
                Continuar
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 4. Velo portal en vidrio ahumado que desciende suavemente y se funde en la interfaz real */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center px-6 py-10"
          initial={{ y: '-44vh', scale: 0.76, opacity: 0 }}
          animate={{
            y: ['-44vh', '0vh', '0vh'],
            scale: [0.76, 0.98, 1.05],
            opacity: [0, 0.72, 0],
          }}
          transition={{
            duration: 1.28,
            delay: 1.08,
            times: [0, 0.54, 1],
            ease: EASE_OUT_EXPO,
          }}
        >
          <div
            className="h-[min(78vh,680px)] w-[min(92vw,1180px)] rounded-[28px] border border-white/25"
            style={{
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(255, 255, 255, 0.05) 100%)',
              boxShadow:
                '0 0 60px -12px rgba(210, 232, 255, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.34)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          />
        </motion.div>

        {/* 5. Motor Canvas 60fps: anillos elípticos de polvo estelar + cometa S-spiral + chispas flotantes */}
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </MotionConfig>
  );
});
