import { memo, useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';

interface StarPoint {
  readonly x: number;
  readonly y: number;
  readonly r?: number;
  readonly glint?: boolean;
}

interface ConstellationDef {
  readonly id: string;
  readonly delay: number;
  readonly duration: number;
  readonly stars: readonly StarPoint[];
  readonly edges: readonly (readonly [number, number])[];
  readonly pulsePath?: string;
  readonly pulseDelay?: number;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.23, 1, 0.32, 1];
const EASE_IN_OUT_STRONG: [number, number, number, number] = [0.77, 0, 0.175, 1];

// Constelaciones perimetrales fieles a la composición visual de referencia (espacio 1440×900)
const CONSTELLATIONS: readonly ConstellationDef[] = [
  {
    id: 'top-left-dipper',
    delay: 0.14,
    duration: 1.05,
    stars: [
      { x: 286, y: 12, r: 1.8 },
      { x: 372, y: 24, r: 2.1 },
      { x: 392, y: 182, r: 2.4, glint: true },
      { x: 464, y: 84, r: 2.0 },
      { x: 540, y: 126, r: 1.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    pulsePath: 'M286 12 L372 24 L392 182 L464 84 L540 126',
    pulseDelay: 2.6,
  },
  {
    id: 'mid-left-crown',
    delay: 0.22,
    duration: 1.15,
    stars: [
      { x: 28, y: 228, r: 1.8 },
      { x: 180, y: 274, r: 2.4, glint: true },
      { x: 276, y: 304, r: 2.0 },
      { x: 348, y: 322, r: 2.2 },
      { x: 294, y: 420, r: 2.0 },
      { x: 164, y: 376, r: 1.8 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 1],
      [2, 4],
    ],
  },
  {
    id: 'bottom-left-prism',
    delay: 0.34,
    duration: 1.2,
    stars: [
      { x: 74, y: 444, r: 1.6 },
      { x: 8, y: 526, r: 1.7 },
      { x: 48, y: 694, r: 1.8 },
      { x: 108, y: 610, r: 1.7 },
      { x: 228, y: 702, r: 2.8, glint: true },
      { x: 134, y: 794, r: 1.9 },
      { x: 318, y: 852, r: 2.2 },
      { x: 388, y: 742, r: 1.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 4],
      [4, 7],
      [6, 7],
    ],
    pulsePath: 'M108 610 L228 702 L318 852 L388 742',
    pulseDelay: 5.2,
  },
  {
    id: 'top-right-arc',
    delay: 0.18,
    duration: 0.9,
    stars: [
      { x: 896, y: 64, r: 1.7 },
      { x: 1052, y: 20, r: 2.1 },
      { x: 1034, y: -4, r: 1.5 },
      { x: 1292, y: 74, r: 2.9, glint: true },
      { x: 1412, y: 18, r: 1.8 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
  },
  {
    id: 'mid-right-ribbon',
    delay: 0.26,
    duration: 1.25,
    stars: [
      { x: 1080, y: 280, r: 2.1 },
      { x: 1180, y: 232, r: 2.0 },
      { x: 1178, y: 174, r: 1.9 },
      { x: 1224, y: 150, r: 2.2 },
      { x: 1318, y: 224, r: 2.0 },
      { x: 1390, y: 240, r: 1.9 },
      { x: 1436, y: 206, r: 1.6 },
      { x: 1408, y: 326, r: 1.8 },
      { x: 1406, y: 404, r: 2.0 },
      { x: 1336, y: 432, r: 1.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [5, 7],
      [7, 8],
      [8, 9],
      [4, 9],
    ],
    pulsePath: 'M1080 280 L1180 232 L1178 174 L1224 150 L1318 224 L1390 240 L1406 404',
    pulseDelay: 4.1,
  },
  {
    id: 'center-right-peak',
    delay: 0.3,
    duration: 1.0,
    stars: [
      { x: 1102, y: 594, r: 1.8 },
      { x: 1166, y: 406, r: 2.5, glint: true },
      { x: 1212, y: 514, r: 1.9 },
      { x: 1276, y: 560, r: 1.7 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  },
  {
    id: 'bottom-right-delta',
    delay: 0.38,
    duration: 1.15,
    stars: [
      { x: 1326, y: 592, r: 1.8 },
      { x: 1312, y: 668, r: 2.0 },
      { x: 1296, y: 736, r: 2.3 },
      { x: 1142, y: 794, r: 2.2 },
      { x: 1348, y: 846, r: 2.4, glint: true },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 2],
    ],
    pulsePath: 'M1326 592 L1312 668 L1296 736 L1142 794 L1348 846',
    pulseDelay: 6.8,
  },
  {
    id: 'bottom-center-horizon',
    delay: 0.42,
    duration: 0.8,
    stars: [
      { x: 814, y: 900, r: 1.5 },
      { x: 876, y: 852, r: 2.0 },
      { x: 934, y: 900, r: 1.5 },
    ],
    edges: [
      [0, 1],
      [1, 2],
    ],
  },
];

// Estrellas brillantes aisladas con destello en cruz de 4 puntas
const GLINT_STARS: readonly { x: number; y: number; size: number; delay: number }[] = [
  { x: 270, y: 206, size: 11, delay: 0.8 },
  { x: 148, y: 412, size: 10, delay: 2.1 },
  { x: 354, y: 554, size: 13, delay: 1.4 },
  { x: 788, y: 52, size: 9, delay: 3.0 },
  { x: 1214, y: 336, size: 14, delay: 0.5 },
  { x: 1126, y: 122, size: 9, delay: 2.7 },
  { x: 64, y: 132, size: 10, delay: 1.9 },
];

// Campo estelar determinista (sin Math.random en render para cero hidratación/parpadeo)
interface FieldStar {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly opacity: number;
  readonly twinkle: boolean;
  readonly duration: number;
  readonly delay: number;
}

function buildStarfield(count: number): readonly FieldStar[] {
  const result: FieldStar[] = [];
  let seed = 42197;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    const x = Math.round(next() * 14400) / 10;
    const y = Math.round(next() * 9000) / 10;
    // Dejar el núcleo central ligeramente más limpio alrededor del logo y los botones
    const inCenter = x > 480 && x < 960 && y > 220 && y < 650;
    if (inCenter && next() < 0.58) {
      continue;
    }
    const r = 0.55 + next() * 1.35;
    const opacity = 0.25 + next() * 0.65;
    const twinkle = i % 3 === 0;
    const duration = 3.4 + next() * 3.8;
    const delay = next() * 5.2;
    result.push({ id: i, x, y, r, opacity, twinkle, duration, delay });
  }
  return result;
}

const FIELD_STARS = buildStarfield(165);

export const CosmicConstellationCanvas = memo(function CosmicConstellationCanvas() {
  const shouldReduceMotion = useReducedMotion();

  // Paralaje celeste sin re-renders de React (solo MotionValues + resortes suaves)
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const smoothX = useSpring(pointerX, { stiffness: 42, damping: 24, mass: 0.9 });
  const smoothY = useSpring(pointerY, { stiffness: 42, damping: 24, mass: 0.9 });

  const deepStarsX = useTransform(smoothX, [-1, 1], [6, -6]);
  const deepStarsY = useTransform(smoothY, [-1, 1], [4, -4]);

  const constellationX = useTransform(smoothX, [-1, 1], [14, -14]);
  const constellationY = useTransform(smoothY, [-1, 1], [10, -10]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      pointerX.set(nx);
      pointerY.set(ny);
    };

    const handlePointerLeave = () => {
      pointerX.set(0);
      pointerY.set(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [pointerX, pointerY, shouldReduceMotion]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#05070B]"
    >
      {/* Gradiente nocturno profundo + sutil atmósfera nebular fría */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(62% 54% at 50% 42%, rgba(22, 32, 48, 0.56) 0%, rgba(10, 14, 22, 0.86) 54%, rgba(4, 6, 10, 1) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-65"
        style={{
          background:
            'radial-gradient(28% 24% at 18% 72%, rgba(140, 175, 225, 0.09) 0%, transparent 72%), radial-gradient(26% 24% at 84% 64%, rgba(136, 168, 220, 0.09) 0%, transparent 72%), radial-gradient(30% 22% at 50% 34%, rgba(190, 214, 255, 0.06) 0%, transparent 75%)',
        }}
      />

      {/* Capa profunda de estrellas con parpadeo orgánico GPU */}
      <motion.svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)]"
        style={shouldReduceMotion ? undefined : { x: deepStarsX, y: deepStarsY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.18 : 0.7, ease: EASE_OUT_EXPO }}
      >
        {FIELD_STARS.map((star) => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#F4F8FF"
            fillOpacity={star.opacity}
            className={!shouldReduceMotion && star.twinkle ? 'luca-star-twinkle' : undefined}
            style={
              !shouldReduceMotion && star.twinkle
                ? {
                    animationDuration: `${star.duration.toFixed(2)}s`,
                    animationDelay: `${star.delay.toFixed(2)}s`,
                  }
                : undefined
            }
          />
        ))}

        {/* Destellos en cruz de 4 puntas */}
        {GLINT_STARS.map((g, idx) => (
          <g
            key={idx}
            transform={`translate(${g.x} ${g.y})`}
            className={shouldReduceMotion ? undefined : 'luca-star-twinkle'}
            style={
              shouldReduceMotion
                ? undefined
                : { animationDuration: `${4.6 + idx * 0.55}s`, animationDelay: `${g.delay}s` }
            }
          >
            <line
              x1={-g.size}
              y1={0}
              x2={g.size}
              y2={0}
              stroke="#FFFFFF"
              strokeWidth="0.7"
              strokeOpacity="0.65"
            />
            <line
              x1={0}
              y1={-g.size}
              x2={0}
              y2={g.size}
              stroke="#FFFFFF"
              strokeWidth="0.7"
              strokeOpacity="0.65"
            />
            <circle cx={0} cy={0} r={1.8} fill="#FFFFFF" />
            <circle cx={0} cy={0} r={5.5} fill="#DCEBFF" fillOpacity="0.18" />
          </g>
        ))}
      </motion.svg>

      {/* Capa frontal de constelaciones animadas con Motion (pathLength + vértices luminosos + pulsos viajeros) */}
      <motion.svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]"
        style={shouldReduceMotion ? undefined : { x: constellationX, y: constellationY }}
      >
        <defs>
          <radialGradient id="luca-star-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#CFE2FF" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#CFE2FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {CONSTELLATIONS.map((constellation) => (
          <g key={constellation.id}>
            {/* Trazos finos de constelación dibujándose orgánicamente */}
            {constellation.edges.map(([fromIdx, toIdx], edgeIndex) => {
              const a = constellation.stars[fromIdx];
              const b = constellation.stars[toIdx];
              if (!a || !b) return null;
              const edgeDelay = constellation.delay + edgeIndex * 0.085;
              return (
                <motion.line
                  key={`${constellation.id}-e-${edgeIndex}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#DCE8FF"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { pathLength: 0, opacity: 0 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { opacity: 0.34 }
                      : { pathLength: 1, opacity: 0.36 }
                  }
                  transition={{
                    pathLength: {
                      duration: constellation.duration * 0.72,
                      delay: edgeDelay,
                      ease: EASE_OUT_EXPO,
                    },
                    opacity: {
                      duration: shouldReduceMotion ? 0.18 : 0.45,
                      delay: shouldReduceMotion ? 0 : edgeDelay,
                      ease: EASE_OUT_EXPO,
                    },
                  }}
                />
              );
            })}

            {/* Pulso luminoso sutil que recorre la constelación periódicamente */}
            {!shouldReduceMotion && constellation.pulsePath && (
              <motion.path
                d={constellation.pulsePath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.35"
                strokeLinecap="round"
                initial={{ pathLength: 0.14, pathOffset: 0, opacity: 0 }}
                animate={{
                  pathOffset: [0, 1],
                  opacity: [0, 0.72, 0.72, 0],
                }}
                transition={{
                  duration: 2.6,
                  delay: constellation.pulseDelay ?? 3.2,
                  repeat: Infinity,
                  repeatDelay: 7.4,
                  ease: EASE_IN_OUT_STRONG,
                }}
              />
            )}

            {/* Estrellas vértice con halo suave */}
            {constellation.stars.map((star, starIndex) => {
              const radius = star.r ?? 1.9;
              const starDelay = constellation.delay + starIndex * 0.065;
              return (
                <motion.g
                  key={`${constellation.id}-s-${starIndex}`}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.75 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.18 : 0.55,
                    delay: shouldReduceMotion ? 0 : starDelay,
                    ease: EASE_OUT_EXPO,
                  }}
                  style={{ transformOrigin: `${star.x}px ${star.y}px` }}
                >
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={star.glint ? radius * 5.2 : radius * 3.4}
                    fill="url(#luca-star-halo)"
                  />
                  {star.glint && (
                    <>
                      <line
                        x1={star.x - 11}
                        y1={star.y}
                        x2={star.x + 11}
                        y2={star.y}
                        stroke="#FFFFFF"
                        strokeWidth="0.7"
                        strokeOpacity="0.72"
                      />
                      <line
                        x1={star.x}
                        y1={star.y - 11}
                        x2={star.x}
                        y2={star.y + 11}
                        stroke="#FFFFFF"
                        strokeWidth="0.7"
                        strokeOpacity="0.72"
                      />
                    </>
                  )}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={radius}
                    fill="#FFFFFF"
                    className={!shouldReduceMotion && star.glint ? 'luca-star-twinkle' : undefined}
                    style={
                      !shouldReduceMotion && star.glint
                        ? {
                            animationDuration: `${4.2 + starIndex * 0.7}s`,
                            animationDelay: `${starDelay}s`,
                          }
                        : undefined
                    }
                  />
                </motion.g>
              );
            })}
          </g>
        ))}
      </motion.svg>
    </div>
  );
});
