import {mushafPageTurnTarget, mushafSpreadPages} from './mushaf-page-turns.ts';
import {LAST_READER_PAGE} from '../data/mushaf.ts';

/** Immediate reading positions only; appendix sheets turn individually. */
export function mushafNeighbors(page: number, spread: boolean, direction = 1): number[] {
  return [direction, -direction].map(delta => mushafPageTurnTarget(page, delta, spread))
    .filter(target => target >= 1 && target <= LAST_READER_PAGE);
}

/** In a spread, two visible leaves leave one speculative slot. */
export function mushafPreloadLeaves(page: number, spread: boolean, direction = 1): number[] {
  const visible = mushafSpreadPages(page, spread);
  const neighbors = mushafNeighbors(page, spread, direction).flatMap(anchor => {
    const leaves = mushafSpreadPages(anchor, spread);
    return anchor < page ? leaves.reverse() : leaves;
  });
  return [...new Set([...visible, ...neighbors])].slice(0, 3);
}
