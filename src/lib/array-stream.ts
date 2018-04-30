import { Readable } from 'stream';

export class ArrayStream extends Readable {
  private source: any[] | null;

  constructor(source: any[]) {
    super({ objectMode: true });
    this.source = source.slice();
  }

  _read(size: number): void {
    if (this.source) {
      for (const source of this.source) {
        this.push(source);
      }
      this.push(null);
      this.source = null;
    }
  }
}
