import type { BodyModel } from '@luca/domain';
import { AVATAR_VIEWBOX, computeFrontAvatarAnchors } from './anchors';

export interface SideAvatarAnchors {
  readonly scale: number;
  readonly centerX: number;
  readonly headCenterY: number;
  readonly headRadius: number;
  readonly neckY: number;
  readonly shoulderY: number;
  readonly chestY: number;
  readonly waistY: number;
  readonly hipY: number;
  readonly crotchY: number;
  readonly ankleY: number;

  /** Coordenadas X (espalda a la izquierda, frente a la derecha) */
  readonly shoulderBackX: number;
  readonly shoulderFrontX: number;
  readonly chestBackX: number;
  readonly chestFrontX: number;
  readonly waistBackX: number;
  readonly waistFrontX: number;
  readonly hipBackX: number;
  readonly hipFrontX: number;
  readonly legBackX: number;
  readonly legFrontX: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Calcula anclajes de perfil desde `BodyModel` alineados verticalmente con la vista de frente.
 * Asimetría anatómica coherente con `projectSide()` en `@luca/domain`:
 * pecho sobresale levemente al frente (derecha) y cadera hacia atrás (izquierda).
 */
export function computeSideAvatarAnchors(model: BodyModel): SideAvatarAnchors {
  const front = computeFrontAvatarAnchors(model);
  const cx = AVATAR_VIEWBOX.centerX;
  const s = front.scale;

  const chestDepthPx = model.sections.chest.depthCm * s;
  const waistDepthPx = model.sections.waist.depthCm * s;
  const hipDepthPx = model.sections.hip.depthCm * s;
  const shoulderDepthPx = chestDepthPx * 0.58;
  const legDepthPx = Math.max(16, hipDepthPx * 0.42);

  return {
    scale: s,
    centerX: cx,
    headCenterY: front.headCenterY,
    headRadius: front.headRadius,
    neckY: front.neckY,
    shoulderY: front.shoulderY,
    chestY: front.chestY,
    waistY: front.waistY,
    hipY: front.hipY,
    crotchY: front.crotchY,
    ankleY: front.ankleY,

    shoulderBackX: round2(cx - shoulderDepthPx * 0.5),
    shoulderFrontX: round2(cx + shoulderDepthPx * 0.5),
    chestBackX: round2(cx - chestDepthPx * 0.44),
    chestFrontX: round2(cx + chestDepthPx * 0.56),
    waistBackX: round2(cx - waistDepthPx * 0.48),
    waistFrontX: round2(cx + waistDepthPx * 0.52),
    hipBackX: round2(cx - hipDepthPx * 0.56),
    hipFrontX: round2(cx + hipDepthPx * 0.44),
    legBackX: round2(cx - legDepthPx * 0.52),
    legFrontX: round2(cx + legDepthPx * 0.48),
  };
}
