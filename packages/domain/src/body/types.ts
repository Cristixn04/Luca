import type { FitState } from '../fit/types.js';

export const AVATAR_VIEWS = ['front', 'side', 'back'] as const;
export type AvatarView = (typeof AVATAR_VIEWS)[number];

export const BODY_SECTIONS = ['chest', 'waist', 'hip'] as const;
export type BodySection = (typeof BODY_SECTIONS)[number];

export interface RequiredBodyMeasurements {
  /** Altura total en cm */
  readonly height: number;
  /** Ancho de hombros (lineal) en cm */
  readonly shoulders: number;
  /** Perímetro de pecho en cm */
  readonly chest: number;
  /** Perímetro de cintura en cm */
  readonly waist: number;
  /** Perímetro de cadera en cm */
  readonly hip: number;
  /** Entrepierna (tiro al tobillo) en cm */
  readonly inseam: number;
}

export interface OptionalBodyMeasurements {
  /** Largo de torso (hombro a cintura) en cm */
  readonly torsoLength?: number;
  /** Fondo (profundidad frente-espalda) del pecho en cm */
  readonly chestDepth?: number;
  /** Fondo de la cintura en cm */
  readonly waistDepth?: number;
  /** Fondo de la cadera en cm */
  readonly hipDepth?: number;
  /** Ancho de espalda (lineal) en cm */
  readonly backWidth?: number;
  /** Largo de espalda en cm */
  readonly backLength?: number;
}

export interface BodyMeasurements {
  readonly required: RequiredBodyMeasurements;
  readonly optional?: OptionalBodyMeasurements;
}

export interface ValidationIssue {
  readonly field: string;
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

export interface EllipseSection {
  readonly section: BodySection;
  /** Perímetro objetivo en cm */
  readonly perimeterCm: number;
  /** Semiancho lateral (a) en cm */
  readonly semiWidthA: number;
  /** Semifondo frente-espalda (b) en cm */
  readonly semiDepthB: number;
  /** Ancho total proyectado (2a) en cm */
  readonly widthCm: number;
  /** Fondo total proyectado (2b) en cm */
  readonly depthCm: number;
  /** Relación fondo/ancho (b / a) */
  readonly depthRatio: number;
  /** true si el fondo se estimó con la relación por defecto */
  readonly depthEstimated: boolean;
  /** Error relativo respecto al perímetro medido (0..1) */
  readonly relativeError: number;
}

export interface VerticalLandmarksCm {
  readonly headTopY: number;
  readonly shoulderY: number;
  readonly chestY: number;
  readonly waistY: number;
  readonly hipY: number;
  readonly crotchY: number;
  readonly floorY: number;
  readonly torsoEstimated: boolean;
}

export interface BodyModel {
  readonly heightCm: number;
  readonly shouldersWidthCm: number;
  readonly backWidthCm: number;
  readonly backWidthEstimated: boolean;
  readonly backLengthCm: number;
  readonly backLengthEstimated: boolean;
  readonly sections: Readonly<Record<BodySection, EllipseSection>>;
  readonly landmarks: VerticalLandmarksCm;
  readonly estimatedFields: readonly string[];
}

export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
}

export interface ProjectedZoneBand {
  readonly zone: 'shoulders' | 'chest' | 'waist' | 'hip' | 'back';
  readonly yCm: number;
  readonly spanCm: number;
  readonly estimated: boolean;
  readonly fitState?: FitState;
}

export interface ViewProjection {
  readonly view: AvatarView;
  readonly heightCm: number;
  readonly maxSpanCm: number;
  readonly leftContour: readonly ProjectedPoint[];
  readonly rightContour: readonly ProjectedPoint[];
  readonly zones: readonly ProjectedZoneBand[];
  readonly estimatedZones: readonly string[];
}

export interface AllViewProjections {
  readonly front: ViewProjection;
  readonly side: ViewProjection;
  readonly back: ViewProjection;
}
