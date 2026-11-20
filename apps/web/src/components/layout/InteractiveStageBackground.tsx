import { useEffect, useRef } from 'react';

/**
 * Fondo interactivo global estilo ciclorama de estudio fotográfico.
 * - Modo claro: blanco puro (#FFFFFF) con haz de luz ambiental reactivo al puntero.
 * - Modo oscuro: gris oscuro (#181818) con el mismo comportamiento lumínico adaptado.
 * - Solo usa transform: translate3d() en GPU (sin canvas, sin re-renders por frame)
 *   y permanece estático en dispositivos táctiles o con prefers-reduced-motion.
 */
export function InteractiveStageBackground() {
  const sweepRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    let rafId = 0;
    let active = false;
    let currentX = window.innerWidth * 0.5;
    let currentY = window.innerHeight * 0.38;
    let targetX = currentX;
    let targetY = currentY;

    const applyTransform = () => {
      const sweepEl = sweepRef.current;
      const sheenEl = sheenRef.current;
      if (sweepEl) {
        sweepEl.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
      }
      if (sheenEl) {
        const vw = Math.max(window.innerWidth, 1);
        const normX = (currentX / vw - 0.5) * 140;
        sheenEl.style.transform = `translate3d(${normX.toFixed(1)}px, 0, 0)`;
      }
    };

    const tick = () => {
      rafId = 0;
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
        currentX = targetX;
        currentY = targetY;
        applyTransform();
        return;
      }

      currentX += dx * 0.1;
      currentY += dy * 0.1;
      applyTransform();
      rafId = window.requestAnimationFrame(tick);
    };

    const scheduleTick = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!active) {
        active = true;
        sweepRef.current?.classList.add('is-active');
      }
      scheduleTick();
    };

    const handlePointerLeave = () => {
      active = false;
      sweepRef.current?.classList.remove('is-active');
      targetX = window.innerWidth * 0.5;
      targetY = window.innerHeight * 0.42;
      scheduleTick();
    };

    const detach = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      sweepRef.current?.classList.remove('is-active');
    };

    const syncListeners = () => {
      detach();
      if (!reducedMotionQuery.matches && finePointerQuery.matches) {
        applyTransform();
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', handlePointerLeave, {
          passive: true,
        });
      }
    };

    syncListeners();
    reducedMotionQuery.addEventListener('change', syncListeners);
    finePointerQuery.addEventListener('change', syncListeners);

    return () => {
      detach();
      reducedMotionQuery.removeEventListener('change', syncListeners);
      finePointerQuery.removeEventListener('change', syncListeners);
    };
  }, []);

  return (
    <div className="luca-studio-backdrop" aria-hidden="true">
      <div className="luca-studio-cyclorama" />
      <div className="luca-studio-horizon" />
      <div ref={sheenRef} className="luca-studio-sheen" />
      <div ref={sweepRef} className="luca-studio-sweep" />
    </div>
  );
}
