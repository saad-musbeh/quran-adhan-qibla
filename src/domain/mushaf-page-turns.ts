/** Quran pages run right to left; a spread always opens on its odd-numbered page.
 * The two appendix sheets after the Quran each occupy their own page. */
import { KHATM_DUA_PAGE, KHATM_DUA_LAST_PAGE } from '../data/mushaf.ts';

export function mushafSpreadPages(page: number, spread: boolean): number[] {
  if (page >= KHATM_DUA_PAGE) return [page];
  return spread ? [page - (page % 2 === 0 ? 1 : 0), page - (page % 2 === 0 ? 1 : 0) + 1] : [page];
}

/** Resolve a gesture to the canonical page anchor used by the landscape UI. */
export function mushafPageTurnTarget(from: number, delta: number, spread: boolean): number {
  const step = spread && from < KHATM_DUA_PAGE ? 2 : 1;
  const rawTarget = from + delta * step;
  return spread && rawTarget === 604 ? 603 : rawTarget;
}

/** Track the displayed WebView page while React commits can lag behind swipes. */
export class MushafPageTurns {
  private pending = new Map<number, number>();
  sequence = 0;
  page: number;
  private step: 1 | 2;
  constructor(page: number, step: 1 | 2 = 1) { this.page = page; this.step = step; }

  accept(from: number, delta: number, sequence: number): number | null {
    const target = mushafPageTurnTarget(from, delta, this.step === 2);
    if (from !== this.page || (delta !== 1 && delta !== -1) ||
        sequence !== this.sequence + 1 || target < 1 || target > KHATM_DUA_LAST_PAGE) return null;
    this.page = target;
    this.sequence = sequence;
    this.pending.set(target, sequence);
    return target;
  }

  /** null means this is an intermediate React commit, not the latest turn. */
  request(page: number): number | null {
    const sequence = this.pending.get(page);
    if (sequence !== undefined && sequence < this.sequence) return null;
    this.pending.clear();
    this.page = page;
    return this.sequence;
  }
}
