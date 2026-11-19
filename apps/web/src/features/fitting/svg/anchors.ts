import type { BodyModel } from '@luca/domain';

export const AVATAR_VIEWBOX = {
  width: 300,
  height: 430,
  centerX: 150,
  topPadding: 20,
  bottomPadding: 20,
} as const;

export interface FrontAvatarAnchors {
  readonly scale: number;
  readonly centerX: number;
  readonly headCenterY: number;
  readonly headRadius: number;
  readonly neckY: number;
  readonly neckHalfW: number;
  readonly shoulderY: number;
  readonly shoulderHalfW: number;
  readonly chestY: number;
  readonly chestHalfW: number;
  readonly waistY: number;
  readonly waistHalfW: number;
  readonly hipY: number;
  readonly hipHalfW: number;
  readonly crotchY: number;
  readonly kneeY: number;
  readonly ankleY: number;
  readonly legOuterHipX: number;
  readonly thighHalfW: number;
  readonly ankleHalfW: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function computeFrontAvatarAnchors(model: BodyModel): FrontAvatarAnchors {
  const usableHeight = AVATAR_VIEWBOX.height - AVATAR_VIEWBOX.topPadding - AVATAR_VIEWBOX.bottomPadding;
  const scale = usableHeight / model.heightCm;
  const toY = (cm: number) => round2(AVATAR_VIEWBOX.topPadding + cm * scale);
  const toHalf = (widthCm: number) => round2((widthCm / 2) * scale);

  const headHeightPx = (model.landmarks.shoulderY * 0.68) * scale;
  const headRadius = round2(Math.max(12, Math.min(24, headHeightPx / 2)));
  const headCenterY = round2(AVATAR_VIEWBOX.topPadding + headRadius);
  const neckY = round2(headCenterY + headRadius + 6);

  const shoulderY = toY(model.landmarks.shoulderY);
  const chestY = toY(model.landmarks.chestY);
  const waistY = toY(model.landmarks.waistY);
  const hipY = toY(model.landmarks.hipY);
  const crotchY = toY(model.landmarks.crotchY);
  const ankleY = toY(model.landmarks.floorY);
  const kneeY = round2(crotchY + (ankleY - crotchY) * 0.48);

  const shoulderHalfW = toHalf(model.shouldersWidthCm);
  const chestHalfW = toHalf(model.sections.chest.widthCm);
  const waistHalfW = toHalf(model.sections.waist.widthCm);
  const hipHalfW = toHalf(model.sections.hip.widthCm);

  return {
    scale,
    centerX: AVATAR_VIEWBOX.centerX,
    headCenterY,
    headRadius,
    neckY,
    neckHalfW: round2(headRadius * 0.44),
    shoulderY,
    shoulderHalfW,
    chestY,
    chestHalfW,
    waistY,
    waistHalfW,
    hipY,
    hipHalfW,
    crotchY,
    kneeY,
    ankleY,
    legOuterHipX: hipHalfW,
    thighHalfW: round2(hipHalfW * 0.44),
    ankleHalfW: round2(Math.max(7, hipHalfW * 0.2)),
  };
}

/**
 * Convierte holgura en cm a desplazamiento visual por lado en px,
 * aplicando un límite visual máximo para no deformar el dibujo (Sección 5.3).
 */
export function clampVisualEaseOffsetPx(easeCm: number, scale: number): number {
  const rawPerSidePx = (easeCm / 4) * scale;
  return round2(Math.max(-3, Math.min(20, rawPerSidePx)));
}
