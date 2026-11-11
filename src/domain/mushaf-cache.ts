/** Three decoded leaves; serialized reads skip superseded queued requests. */
export class MushafPageCache {
  private entries = new Map<number, { promise: Promise<string>; bytes: number }>();
  private tail: Promise<unknown> = Promise.resolve();
  private read: (key: number) => Promise<string>;
  private byteLimit: number;
  constructor(read: (key: number) => Promise<string>, byteLimit = 5 * 1024 * 1024) {
    this.read = read; this.byteLimit = byteLimit;
  }

  load(key: number): Promise<string> {
    const saved = this.entries.get(key);
    if (saved) {
      this.entries.delete(key); this.entries.set(key, saved);
      return saved.promise;
    }
    // Evict before allocating the replacement, including superseded queued work.
    while (this.entries.size >= 3) this.entries.delete(this.entries.keys().next().value!);
    const entry = { promise: Promise.resolve(''), bytes: 0 };
    entry.promise = this.tail.then(async () => {
      if (this.entries.get(key) !== entry) throw new Error('Page load superseded');
      const svg = await this.read(key);
      if (this.entries.get(key) === entry) {
        entry.bytes = svg.length * 2; // Conservative UTF-16 source budget, not total renderer RAM.
        while ([...this.entries.values()].reduce((sum, item) => sum + item.bytes, 0) > this.byteLimit) {
          this.entries.delete(this.entries.keys().next().value!);
        }
      }
      return svg;
    });
    this.entries.set(key, entry);
    this.tail = entry.promise.then(() => undefined, () => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
    });
    return entry.promise;
  }

  async consume(key: number): Promise<string> {
    const pending = this.load(key);
    try { return await pending; }
    finally {
      if (this.entries.get(key)?.promise === pending) this.entries.delete(key);
    }
  }
  clear() { this.entries.clear(); }
}
