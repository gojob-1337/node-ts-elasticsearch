import { Readable } from 'stream';

export class ArrayStream extends Readable {
  private source: any[];

  constructor(source: any[]) {
    super({ objectMode: true });
    this.source = source.slice();
  }

  _read(size: number): void {
    for (const source of this.source) {
      this.push(source);
    }
    this.push(null);
    this.source = [];
  }
}
