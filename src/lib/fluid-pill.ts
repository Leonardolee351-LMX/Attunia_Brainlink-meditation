/**
 * Motion Craft 式流体指示：前沿快、后沿慢，中间被拉长。
 * lead≈0.20 / tail≈0.105（每帧对目标位置的指数逼近）。
 */

export type FluidEdges = { left: number; right: number };

const LEAD = 0.2;
const TAIL = 0.105;

export function stepFluidEdges(
  edges: FluidEdges,
  targetLeft: number,
  targetRight: number,
): FluidEdges {
  const movingRight = targetLeft + targetRight > edges.left + edges.right;
  if (movingRight) {
    return {
      left: edges.left + (targetLeft - edges.left) * TAIL,
      right: edges.right + (targetRight - edges.right) * LEAD,
    };
  }
  return {
    left: edges.left + (targetLeft - edges.left) * LEAD,
    right: edges.right + (targetRight - edges.right) * TAIL,
  };
}

export function edgesSettled(a: FluidEdges, left: number, right: number, eps = 0.35) {
  return Math.abs(a.left - left) < eps && Math.abs(a.right - right) < eps;
}
