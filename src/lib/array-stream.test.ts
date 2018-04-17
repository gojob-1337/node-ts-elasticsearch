import { Readable } from 'stream';
import { ArrayStream } from './array-stream';

it('returns a readable from an array', () => {
  const stream = new ArrayStream([]);
  expect(stream).toBeInstanceOf(Readable);
});

it('does not modify the source array', () => {
  const source = [{ a: 1 }, { a: 2 }];
  const stream = new ArrayStream(source);
  stream.read();
  expect(source).toEqual([{ a: 1 }, { a: 2 }]);
});

it('does not depend on the original array', () => {
  const source = [{ a: 1 }, { a: 2 }];
  const stream = new ArrayStream(source);
  source.shift();

  const entry = stream.read();
  expect(entry).toEqual({ a: 1 });
});

it('stream data', () => {
  const source = [{ a: 1 }, { a: 2 }];
  const stream = new ArrayStream(source);

  let entry = stream.read();
  expect(entry).toBe(source[0]);

  entry = stream.read();
  expect(entry).toBe(source[1]);

  entry = stream.read();
  expect(entry).toBe(null);
});
