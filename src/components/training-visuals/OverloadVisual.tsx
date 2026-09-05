import GroundStairs from "./GroundStairs";
import TenseReleaseDiscs from "./TenseReleaseDiscs";
import ExhaleTriangle from "./ExhaleTriangle";
import SafePortal from "./SafePortal";
import type { TrainingVisualProps } from "./types";

/** 超载四模块中央 Visual 入口 */
export default function OverloadVisual(props: TrainingVisualProps) {
  switch (props.kind) {
    case "ground-stairs":
      return <GroundStairs {...props} />;
    case "tense-release-discs":
      return <TenseReleaseDiscs {...props} />;
    case "exhale-triangle":
      return <ExhaleTriangle {...props} />;
    case "safe-portal":
      return <SafePortal {...props} />;
    default:
      return null;
  }
}
