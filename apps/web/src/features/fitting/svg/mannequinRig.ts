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

  // Cabeza y cuello (esbeltos estilo maniquí de taller)
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

  // Esqueleto exacto del brazo (compartido por maniquí y mangas para ajuste 100 % exacto)
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

  // Cabeza y cuello estilizados (proporción ~8.5 cabezas de atelier)
  const headRy = r2(clamp(front.headRadius * 0.96, 17, 21.5));
  const headRx = r2(headRy * (isFemale ? 0.67 : 0.72));
  const headCenterY = r2(front.headCenterY - 1);
  const headTopY = r2(headCenterY - headRy);
  const chinY = r2(headCenterY + headRy);
  const neckHalf = r2(isFemale ? headRx * 0.5 : headRx * 0.64);
  const shoulderY = r2(front.shoulderY);
  const neckBaseY = r2(shoulderY - 6);

  // Proporciones corporales armonizadas al cuerpo real + morfología Mujer / Hombre
  const shoulderX = r2(
    clamp(front.shoulderHalfW * (isFemale ? 0.76 : 0.92), neckHalf + 18, 52),
  );
  const chestX = r2(
    clamp(front.chestHalfW * (isFemale ? 0.78 : 0.9), neckHalf + 14, shoulderX - 3),
  );
  const rawBackHalf = (model.backWidthCm / 2) * s;
  const backChestX = r2(
    clamp(Math.max(chestX, rawBackHalf * (isFemale ? 0.76 : 0.9)), chestX, shoulderX - 2),
  );
  const armpitX = r2(chestX + (isFemale ? 1.5 : 2));
  const armpitY = r2(front.chestY + 1);

  const waistX = r2(
    clamp(front.waistHalfW * (isFemale ? 0.73 : 0.88), 16, chestX - (isFemale ? 3 : 1)),
  );
  const hipX = r2(
    clamp(front.hipHalfW * (isFemale ? 0.88 : 0.84), waistX + (isFemale ? 7 : 3), 46),
  );

  const chestY = r2(front.chestY);
  const bustUnderY = r2(chestY + (isFemale ? 11 : 7));
  const waistY = r2(front.waistY);
  const hipY = r2(front.hipY);
  const crotchY = r2(front.crotchY);
  const kneeY = r2(front.kneeY);
  const footY = r2(front.ankleY);
  const legLen = footY - crotchY;
  const calfY = r2(kneeY + (footY - kneeY) * 0.34);
  const ankleJointY = r2(footY - 14);

  // Piernas finas y esculpidas (referencia de atelier)
  const kneeOuterX = r2(hipX * (isFemale ? 0.62 : 0.67));
  const kneeInnerX = r2(isFemale ? 6.2 : 7.4);
  const calfOuterX = r2(hipX * (isFemale ? 0.63 : 0.7));
  const calfInnerX = r2(isFemale ? 6.8 : 7.8);
  const ankleOuterX = r2(isFemale ? 15.2 : 17.5);
  const ankleInnerX = r2(isFemale ? 7.6 : 8.6);

  // Esqueleto anatómico del brazo (deltoides -> bíceps -> codo -> antebrazo -> muñeca -> mano)
  const upperArmThickness = isFemale ? 10.5 : 13.5;
  const elbowThickness = isFemale ? 8.8 : 11.2;
  const forearmThickness = isFemale ? 8.2 : 10.6;
  const wristThickness = isFemale ? 6.2 : 8.0;

  const bicepInner = r2(armpitX + (isFemale ? 3.5 : 4.5));
  const elbowInner = r2(waistX + (isFemale ? 10.5 : 9.5));
  const forearmInner = r2(hipX + (isFemale ? 4.5 : 8.5));
  const wristInner = r2(hipX + (isFemale ? 9.5 : 11.5));

  const arm = {
    deltoid: {
      y: r2(shoulderY + 5),
      outerX: r2(shoulderX + (isFemale ? 3.2 : 4.5)),
      innerX: armpitX,
    },
    bicep: {
      y: r2(chestY + 15),
      outerX: r2(bicepInner + upperArmThickness),
      innerX: bicepInner,
    },
    elbow: {
      y: r2(waistY + 2),
      outerX: r2(elbowInner + elbowThickness),
      innerX: elbowInner,
    },
    forearm: {
      y: r2(hipY - 8),
      outerX: r2(forearmInner + forearmThickness),
      innerX: forearmInner,
    },
    wrist: {
      y: r2(hipY + 15),
      outerX: r2(wristInner + wristThickness),
      innerX: wristInner,
    },
    handTipY: r2(crotchY + (isFemale ? 18 : 20)),
  };

  // Perfil anatómico (espalda izquierda, frente derecha)
  const depthScale = isFemale ? 0.78 : 0.86;
  const halfChestD = clamp(((side.chestFrontX - side.chestBackX) / 2) * depthScale, 15, 28);
  const halfWaistD = clamp(((side.waistFrontX - side.waistBackX) / 2) * (isFemale ? 0.7 : 0.84), 12, 24);
  const halfHipD = clamp(((side.hipFrontX - side.hipBackX) / 2) * (isFemale ? 0.86 : 0.82), 16, 28);

  const sideChestBackX = r2(cx - halfChestD * 0.78);
  const sideChestFrontX = r2(cx + halfChestD * (isFemale ? 0.86 : 1.05));
  const bustApexY = r2(chestY + 2);
  const bustFrontX = r2(sideChestFrontX + (isFemale ? 7.5 : 1.5));
  const underBustY = r2(chestY + (isFemale ? 13 : 9));

  const sideWaistBackX = r2(cx - halfWaistD * (isFemale ? 0.62 : 0.82));
  const sideWaistFrontX = r2(cx + halfWaistD * (isFemale ? 0.92 : 0.96));

  const sideHipBackX = r2(cx - halfHipD * (isFemale ? 1.18 : 0.95));
  const sideHipFrontX = r2(cx + halfHipD * (isFemale ? 0.82 : 0.86));
  const gluteApexY = r2(hipY + 4);

  const sideShoulderBackX = r2(cx - halfChestD * 0.52);
  const sideShoulderFrontX = r2(cx + halfChestD * 0.48);

  const thighBackX = r2(cx - halfHipD * 0.78);
  const thighFrontX = r2(cx + halfHipD * 0.78);
  const kneeBackX = r2(cx - (isFemale ? 8.5 : 10));
  const kneeFrontX = r2(cx + (isFemale ? 10 : 11.5));
  const calfBackX = r2(cx - (isFemale ? 12 : 13.5));
  const calfFrontX = r2(cx + (isFemale ? 6.5 : 8));
  const ankleBackX = r2(cx - (isFemale ? 5.5 : 6.5));
  const ankleFrontX = r2(cx + (isFemale ? 4.5 : 5.5));

  // Brazo de perfil alineado al hombro y cayendo suavemente hacia el muslo delantero
  const sideArmHalfW = isFemale ? 6.4 : 8.2;
  const sideArm = {
    shoulder: {
      y: r2(shoulderY + 8),
      backX: r2(cx - sideArmHalfW - 1.5),
      frontX: r2(cx + sideArmHalfW + 0.5),
    },
    bicep: {
      y: r2(chestY + 15),
      backX: r2(cx - sideArmHalfW - 0.5),
      frontX: r2(cx + sideArmHalfW - 0.5),
    },
    elbow: {
      y: r2(waistY + 3),
      backX: r2(cx - sideArmHalfW + 1),
      frontX: r2(cx + sideArmHalfW + 0.5),
    },
    wrist: {
      y: r2(hipY + 15),
      backX: r2(cx - sideArmHalfW + 4.5),
      frontX: r2(cx + sideArmHalfW + 2.5),
    },
    handTipY: r2(crotchY + (isFemale ? 17 : 19)),
  };

  void legLen;

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
