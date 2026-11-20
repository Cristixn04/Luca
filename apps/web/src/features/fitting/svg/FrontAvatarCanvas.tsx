import type { BodyModel, FitReport } from '@luca/domain';
import type { M2GarmentCategory } from '../store';
import { AvatarViewer } from './AvatarViewer';

export interface FrontAvatarCanvasProps {
  model: BodyModel;
  garmentCategory: M2GarmentCategory;
  fitReport: FitReport | null;
  showHeatmap: boolean;
}

export function FrontAvatarCanvas(props: FrontAvatarCanvasProps) {
  return <AvatarViewer {...props} viewMode="front" onChangeViewMode={() => {}} />;
}
