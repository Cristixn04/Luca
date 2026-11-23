import type { BodyModel } from '@luca/domain';
import type { MannequinSilhouette } from '../store';
import { computeFrontAvatarAnchors, type FrontAvatarAnchors } from './anchors';
import { computeSideAvatarAnchors, type SideAvatarAnchors } from './sideAnchors';

export interface ArmRingPoint {
  readonly y: number;
  readonly outerX: number; // distancia positiva desde cx
  readonly innerX: number; // distancia positiva desde cx
}

export interface SideArmRingPoint {
  readonly y: number;
  readonly backX: number; // coordenada X absoluta
  readonly frontX: number; // coordenada X absoluta
}

export interface MannequinRig {
  readonly silhouette: MannequinSilhouette;
  readonly frontAnchors: FrontAvatarAnchors;
  readonly sideAnchors: SideAvatarAnchors;
  readonly cx: number;
  readonly scale: number;

  // Cabeza y cuello (proporcionales a la estatura real)
  readonly headTopY: number;
  readonly headCenterY: number;
  readonly headRx: number;
  readonly headRy: number;
  readonly chinY: number;
  readonly neckHalf: number;
  readonly neckBaseY: number;

  // Coordenadas X (distancia positiva desde cx) e Y para Frente y Espalda
  readonly shoulderY: number;
  readonly shoulderX: number;
  readonly armpitY: number;
  readonly armpitX: number;
  readonly chestY: number;
  readonly chestX: number;
  readonly backChestX: number;
  readonly bustUnderY: number;
  readonly waistY: number;
  readonly waistX: number;
  readonly hipY: number;
  readonly hipX: number;
  readonly crotchY: number;
  readonly kneeY: number;
  readonly kneeOuterX: number;
  readonly kneeInnerX: number;
  readonly calfY: number;
  readonly calfOuterX: number;
  readonly calfInnerX: number;
  readonly ankleJointY: number;
  readonly ankleOuterX: number;
  readonly ankleInnerX: number;
  readonly footY: number;

  // Esqueleto exacto del brazo (anclado a hombro y estatura, independiente de entrepierna)
  readonly arm: {
    readonly deltoid: ArmRingPoint;
    readonly bicep: ArmRingPoint; // borde de manga corta
    readonly elbow: ArmRingPoint;
    readonly forearm: ArmRingPoint;
    readonly wrist: ArmRingPoint; // puño de manga larga
    readonly handTipY: number;
  };

  // Perfil anatómico (coordenadas X absolutas: espalda izquierda, frente derecha)
  readonly side: {
    readonly shoulderBackX: number;
    readonly shoulderFrontX: number;
    readonly chestBackX: number;
    readonly chestFrontX: number;
    readonly bustApexY: number;
    readonly bustFrontX: number;
    readonly underBustY: number;
    readonly waistBackX: number;
    readonly waistFrontX: number;
    readonly hipBackX: number;
    readonly hipFrontX: number;
    readonly gluteApexY: number;
    readonly thighBackX: number;
    readonly thighFrontX: number;
    readonly kneeBackX: number;
    readonly kneeFrontX: number;
    readonly calfBackX: number;
    readonly calfFrontX: number;
    readonly ankleBackX: number;
    readonly ankleFrontX: number;
  };

  // Esqueleto exacto del brazo de perfil (compartido por maniquí y manga lateral)
  readonly sideArm: {
    readonly shoulder: SideArmRingPoint;
    readonly bicep: SideArmRingPoint;
    readonly elbow: SideArmRingPoint;
    readonly wrist: SideArmRingPoint;
    readonly handTipY: number;
  };
}

function r2(v: number): number {
  return Number(v.toFixed(2));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  const clamped = clamp(t, 0, 1);
  return a + (b - a) * clamped;
}

/**
 * Convierte la holgura real en cm a un margen visual limpio y adherido a la silueta.
 * Siempre garantiza >= 1.2 px por fuera del cuerpo para que la piel nunca sobresalga
 * a través de la prenda, y evita que las prendas se inflen artificialmente.
 */
export function computeFittedEasePx(easeCm: number | undefined, bulkBoost = 0): number {
  const raw = easeCm ?? 3;
  let base: number;
  if (raw <= 0) {
    base = 1.2;
  } else if (raw <= 8) {
    base = 1.4 + (raw / 8) * 2.2;
  } else {
    base = 3.6 + Math.min(4.2, ((raw - 8) / 18) * 4.2);
  }
  return r2(base + bulkBoost);
}

export function computeMannequinRig(
  model: BodyModel,
  silhouette: MannequinSilhouette,
): MannequinRig {
  const front = computeFrontAvatarAnchors(model);
  const side = computeSideAvatarAnchors(model);
  const cx = front.centerX;
  const s = front.scale;
  const isFemale = silhouette === 'female';

  // Cabeza y cuello proporcionales a la estatura (canon editorial ~7.6–7.8 cabezas, sin cuello alargado)
  const headRy = r2(clamp(front.headRadius * 1.12, 18.5, 25));
  const headRx = r2(headRy * (isFemale ? 0.69 : 0.74));
  const shoulderY = r2(front.shoulderY);
  const headCenterY = r2(
    clamp(Math.min(shoulderY - headRy * 1.54, front.headCenterY + 5), headRy + 9, shoulderY - headRy - 10),
  );
  const headTopY = r2(headCenterY - headRy);
  const chinY = r2(headCenterY + headRy);
  const neckHalf = r2(isFemale ? headRx * 0.54 : headRx * 0.66);
  const neckBaseY = r2(chinY + (shoulderY - chinY) * 0.52);

  // Hitos verticales coherentes (si el usuario define largo de espalda sin largo de torso, lo reflejamos en cintura)
  const crotchY = r2(front.crotchY);
  const footY = r2(front.ankleY);
  const minPelvisGapPx = Math.max(22, model.heightCm * 0.06 * s);
  const maxWaistY = crotchY - minPelvisGapPx;
  const minWaistY = shoulderY + Math.max(32, model.heightCm * 0.16 * s);

  const waistY = r2(
    model.landmarks.torsoEstimated && !model.backLengthEstimated
      ? clamp(shoulderY + model.backLengthCm * s, minWaistY, maxWaistY)
      : clamp(front.waistY, minWaistY, maxWaistY),
  );
  const chestY = r2(shoulderY + (waistY - shoulderY) * 0.36);
  const hipY = r2(waistY + (crotchY - waistY) * 0.58);
  const bustUnderY = r2(Math.min(waistY - 8, chestY + (isFemale ? 11 : 7)));
  const armpitY = r2(Math.min(chestY + 1, waistY - 12));
  const kneeY = r2(crotchY + (footY - crotchY) * 0.48);
  const calfY = r2(kneeY + (footY - kneeY) * 0.34);
  const ankleJointY = r2(footY - 14);

  // Proporciones horizontales fieles a las medidas reales (sin topes artificiales que anulen cambios)
  // El ancho de espalda (backWidth) impacta directamente tanto en Espalda como en la silueta dorsal visible de Frente.
  const widthFactor = isFemale ? 0.86 : 0.94;
  const rawShoulderHalf = front.shoulderHalfW * widthFactor;
  const rawChestHalf = front.chestHalfW * (isFemale ? 0.86 : 0.93);
  const rawBackHalf = (model.backWidthCm / 2) * s * (isFemale ? 0.86 : 0.93);
  const defaultBackHalf = ((model.shouldersWidthCm * 0.9) / 2) * s * (isFemale ? 0.86 : 0.93);
  const backDeltaPx = model.backWidthEstimated ? 0 : rawBackHalf - defaultBackHalf;

  const backChestX = r2(clamp(rawBackHalf, neckHalf + 11, 70));
  const chestX = r2(clamp(rawChestHalf + backDeltaPx * 0.55, neckHalf + 11, 68));
  const armpitX = r2(
    clamp(chestX + (isFemale ? 1.5 : 2) + backDeltaPx * 0.25, neckHalf + 12, 70),
  );
  const shoulderX = r2(
    clamp(Math.max(rawShoulderHalf + backDeltaPx * 0.35, armpitX + 2.2), neckHalf + 15, 74),
  );

  const waistX = r2(clamp(front.waistHalfW * (isFemale ? 0.84 : 0.92), 14, 66));
  const hipX = r2(clamp(front.hipHalfW * (isFemale ? 0.92 : 0.88), 18, 70));

  // Piernas atléticas y esculpidas (muslo lleno, gemelo medial hacia adentro, tobillo definido)
  const kneeInnerX = r2(isFemale ? 4.8 : 5.4);
  const kneeOuterX = r2(clamp(hipX * (isFemale ? 0.68 : 0.72), kneeInnerX + 12, 46));
  const calfInnerX = r2(isFemale ? 4.3 : 4.8);
  const calfOuterX = r2(clamp(hipX * (isFemale ? 0.67 : 0.74), calfInnerX + 13, 47));
  const ankleInnerX = r2(isFemale ? 6.6 : 7.4);
  const ankleOuterX = r2(
    clamp(ankleInnerX + (isFemale ? 8.2 : 9.8) + (hipX - 34) * 0.08, ankleInnerX + 7.5, 24),
  );

  // Longitud anatómica real de brazos: depende SOLO de estatura y hombro (nunca se alargan con la entrepierna)
  const armLengthPx = model.heightCm * 0.335 * s;
  const handLengthPx = model.heightCm * 0.108 * s;
  const deltoidY = r2(shoulderY + armLengthPx * 0.06);
  const bicepY = r2(shoulderY + armLengthPx * 0.28);
  const elbowY = r2(shoulderY + armLengthPx * 0.5);
  const forearmY = r2(shoulderY + armLengthPx * 0.74);
  const wristY = r2(Math.min(footY - handLengthPx - 14, shoulderY + armLengthPx));
  const handTipY = r2(Math.min(footY - 10, wristY + handLengthPx));

  // Silueta lateral máxima del torso/caderas a cualquier altura Y para que los brazos jamás atraviesen el cuerpo
  const upperTorsoMaxX = Math.max(chestX, backChestX);
  const torsoHalfWidthAtY = (y: number): number => {
    if (y <= shoulderY) return shoulderX;
    if (y <= chestY) return lerp(shoulderX, upperTorsoMaxX, (y - shoulderY) / Math.max(1, chestY - shoulderY));
    if (y <= waistY) return lerp(upperTorsoMaxX, waistX, (y - chestY) / Math.max(1, waistY - chestY));
    if (y <= hipY) return lerp(waistX, hipX, (y - waistY) / Math.max(1, hipY - waistY));
    if (y <= crotchY) return lerp(hipX, hipX * 0.94, (y - hipY) / Math.max(1, crotchY - hipY));
    return lerp(hipX * 0.94, kneeOuterX, (y - crotchY) / Math.max(1, kneeY - crotchY));
  };

  // Grosor anatómico atlético del brazo proporcional a la complexión superior
  const buildFactor = clamp((chestX + shoulderX) / 80, 0.86, 1.32);
  const upperArmThickness = r2((isFemale ? 11.8 : 15.8) * buildFactor);
  const elbowThickness = r2((isFemale ? 9.8 : 12.8) * buildFactor);
  const forearmThickness = r2((isFemale ? 9.4 : 12.6) * buildFactor);
  const wristThickness = r2((isFemale ? 6.4 : 8.2) * buildFactor);

  // Caída natural en ligera postura en A (~7°) desde el deltoides, con aire limpio junto a cintura y cadera
  const shoulderBaseInner = armpitX + (isFemale ? 3.2 : 4.0);
  const maxOuterX = 144;
  const bicepInner = r2(
    Math.min(maxOuterX - upperArmThickness, Math.max(shoulderBaseInner, torsoHalfWidthAtY(bicepY) + 3.4)),
  );
  const elbowInner = r2(
    Math.min(
      maxOuterX - elbowThickness,
      Math.max(bicepInner + 2.8, torsoHalfWidthAtY(elbowY) + 6.5),
    ),
  );
  const forearmInner = r2(
    Math.min(
      maxOuterX - forearmThickness,
      Math.max(elbowInner + 2.4, torsoHalfWidthAtY(forearmY) + 7.4),
    ),
  );
  const wristInner = r2(
    Math.min(
      maxOuterX - wristThickness,
      Math.max(forearmInner + 2.2, torsoHalfWidthAtY(wristY) + 8.6),
    ),
  );

  const arm = {
    deltoid: {
      y: deltoidY,
      outerX: r2(Math.min(maxOuterX, Math.max(shoulderX + (isFemale ? 4.2 : 6.2), bicepInner + upperArmThickness))),
      innerX: armpitX,
    },
    bicep: {
      y: bicepY,
      outerX: r2(bicepInner + upperArmThickness),
      innerX: bicepInner,
    },
    elbow: {
      y: elbowY,
      outerX: r2(elbowInner + elbowThickness),
      innerX: elbowInner,
    },
    forearm: {
      y: forearmY,
      outerX: r2(forearmInner + forearmThickness),
      innerX: forearmInner,
    },
    wrist: {
      y: wristY,
      outerX: r2(wristInner + wristThickness),
      innerX: wristInner,
    },
    handTipY,
  };

  // Perfil anatómico con postura natural en S (espalda torácica, pecho erguido, arco lumbar, glúteo y gemelo)
  const halfChestD = clamp(((side.chestFrontX - side.chestBackX) / 2) * (isFemale ? 0.94 : 1.04), 15, 48);
  const halfWaistD = clamp(((side.waistFrontX - side.waistBackX) / 2) * (isFemale ? 0.86 : 0.94), 12, 46);
  const halfHipD = clamp(((side.hipFrontX - side.hipBackX) / 2) * (isFemale ? 0.98 : 0.98), 16, 50);

  const sideChestBackX = r2(cx - halfChestD * 0.88);
  const sideChestFrontX = r2(cx + halfChestD * (isFemale ? 0.92 : 1.08));
  const bustApexY = r2(chestY + 2);
  const bustFrontX = r2(sideChestFrontX + (isFemale ? 8.2 : 2.6));
  const underBustY = r2(bustUnderY + 2);

  const sideWaistBackX = r2(cx - halfWaistD * (isFemale ? 0.62 : 0.74));
  const sideWaistFrontX = r2(cx + halfWaistD * (isFemale ? 0.9 : 0.94));

  const sideHipBackX = r2(cx - halfHipD * (isFemale ? 1.24 : 1.12));
  const sideHipFrontX = r2(cx + halfHipD * (isFemale ? 0.84 : 0.88));
  const gluteApexY = r2(hipY + 5);

  const sideShoulderBackX = r2(cx - halfChestD * 0.62);
  const sideShoulderFrontX = r2(cx + halfChestD * 0.52);

  const legDepthFactor = clamp(halfHipD / 22, 0.82, 1.38);
  const thighBackX = r2(cx - halfHipD * 0.84);
  const thighFrontX = r2(cx + halfHipD * 0.86);
  const kneeBackX = r2(cx - (isFemale ? 8.8 : 10.6) * legDepthFactor);
  const kneeFrontX = r2(cx + (isFemale ? 11.2 : 12.8) * legDepthFactor);
  const calfBackX = r2(cx - (isFemale ? 14.2 : 16.4) * legDepthFactor);
  const calfFrontX = r2(cx + (isFemale ? 7.4 : 8.8) * legDepthFactor);
  const ankleBackX = r2(cx - (isFemale ? 5.6 : 6.6));
  const ankleFrontX = r2(cx + (isFemale ? 5.2 : 6.2));

  // Brazo de perfil atlético con leve caída natural hacia adelante en antebrazo (independiente de entrepierna)
  const sideArmCenterX = (sideShoulderBackX + sideShoulderFrontX) / 2 - 1.5;
  const sideArmHalfW = r2((isFemale ? 7.0 : 9.4) * buildFactor);
  const sideArm = {
    shoulder: {
      y: deltoidY,
      backX: r2(sideArmCenterX - sideArmHalfW - 2.2),
      frontX: r2(sideArmCenterX + sideArmHalfW + 1.2),
    },
    bicep: {
      y: bicepY,
      backX: r2(sideArmCenterX - sideArmHalfW - 1.2),
      frontX: r2(sideArmCenterX + sideArmHalfW - 0.6),
    },
    elbow: {
      y: elbowY,
      backX: r2(sideArmCenterX - sideArmHalfW + 0.5),
      frontX: r2(sideArmCenterX + sideArmHalfW + 1.4),
    },
    wrist: {
      y: wristY,
      backX: r2(sideArmCenterX - sideArmHalfW + 7.2),
      frontX: r2(sideArmCenterX + sideArmHalfW + 3.4),
    },
    handTipY,
  };

  return {
    silhouette,
    frontAnchors: front,
    sideAnchors: side,
    cx,
    scale: s,
    headTopY,
    headCenterY,
    headRx,
    headRy,
    chinY,
    neckHalf,
    neckBaseY,
    shoulderY,
    shoulderX,
    armpitY,
    armpitX,
    chestY,
    chestX,
    backChestX,
    bustUnderY,
    waistY,
    waistX,
    hipY,
    hipX,
    crotchY,
    kneeY,
    kneeOuterX,
    kneeInnerX,
    calfY,
    calfOuterX,
    calfInnerX,
    ankleJointY,
    ankleOuterX,
    ankleInnerX,
    footY,
    arm,
    side: {
      shoulderBackX: sideShoulderBackX,
      shoulderFrontX: sideShoulderFrontX,
      chestBackX: sideChestBackX,
      chestFrontX: sideChestFrontX,
      bustApexY,
      bustFrontX,
      underBustY,
      waistBackX: sideWaistBackX,
      waistFrontX: sideWaistFrontX,
      hipBackX: sideHipBackX,
      hipFrontX: sideHipFrontX,
      gluteApexY,
      thighBackX,
      thighFrontX,
      kneeBackX,
      kneeFrontX,
      calfBackX,
      calfFrontX,
      ankleBackX,
      ankleFrontX,
    },
    sideArm,
  };
}
