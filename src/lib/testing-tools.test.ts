export function deepFreeze(obj: any): any {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    if (Array.isArray(obj)) {
      obj.forEach(deepFreeze);
    } else {
      Object.keys(obj).forEach((key: string) => deepFreeze(obj[key]));
    }
  }
  return obj;
}

describe('testing tools: deepFreeze', () => {
  it('freeze object and nested', () => {
    const src = {
      a: 1,
      b: { c: 2 },
      d: { e: { f: 3 } },
    };
    const res = deepFreeze(src);
    expect(res).toBe(src);
    expect(res).toEqual({
      a: 1,
      b: { c: 2 },
      d: { e: { f: 3 } },
    });
    expect(Object.isFrozen(src)).toBe(true);
    expect(Object.isFrozen(src.b)).toBe(true);
    expect(Object.isFrozen(src.d)).toBe(true);
    expect(Object.isFrozen(src.d.e)).toBe(true);
  });

  it('freeze array and nested', () => {
    const src = {
      a: [{ b: 2 }, { c: 3 }],
      d: [{ e: 4, f: { g: 5 } }],
    };
    const res = deepFreeze(src);
    expect(res).toBe(src);
    expect(res).toEqual({
      a: [{ b: 2 }, { c: 3 }],
      d: [{ e: 4, f: { g: 5 } }],
    });
    expect(Object.isFrozen(src)).toBe(true);
    expect(Object.isFrozen(src.a)).toBe(true);
    expect(Object.isFrozen(src.a[0])).toBe(true);
    expect(Object.isFrozen(src.a[1])).toBe(true);

    expect(Object.isFrozen(src.d[0])).toBe(true);
    expect(Object.isFrozen(src.d[0].f)).toBe(true);
  });
});
