/** Quran pages run right to left; a spread always opens on its odd-numbered page. */
export function mushafSpreadPages(page: number, spread: boolean): number[] {
  return spread ? [page - (page % 2 === 0 ? 1 : 0), page - (page % 2 === 0 ? 1 : 0) + 1] : [page];
}

/** Track the displayed WebView page while React commits can lag behind swipes. */
export class MushafPageTurns {
  private pending = new Map<number, number>();
  sequence = 0;
  page: number;
  private step: 1 | 2;
  constructor(page: number, step: 1 | 2 = 1) { this.page = page; this.step = step; }

  accept(from: number, delta: number, sequence: number): number | null {
    const target = from + delta * this.step;
    if (from !== this.page || (delta !== 1 && delta !== -1) ||
        sequence !== this.sequence + 1 || target < 1 || target > 604) return null;
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
