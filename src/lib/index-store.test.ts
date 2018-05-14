import { IndexStore } from './index-store';

class User {}

class Twitter {}

const store = (IndexStore as any).store;

beforeEach(() => {
  // flush internal store
  store.length = 0;
});

describe('add', () => {
  it('stores classes', () => {
    IndexStore.add(User);
    IndexStore.add(Twitter);
    expect(store).toEqual([User, Twitter]);
  });

  it('throw if push a non function', () => {
    expect.assertions(1);
    try {
      IndexStore.add(new User() as any);
    } catch (err) {
      expect(err).toEqual(new Error('Function expected'));
    }
  });
});

describe('flush', () => {
  beforeEach(() => {
    store.push(User, Twitter);
  });

  it('empty internal store', () => {
    IndexStore.flush();
    expect(store).toEqual([]);
  });

  it('does not change store reference', () => {
    IndexStore.flush();
    expect(store).toBe((IndexStore as any).store);
  });
});

describe('getAll', () => {
  beforeEach(() => {
    store.push(User, Twitter);
  });

  it('returns store content', () => {
    expect(IndexStore.getAll()).toEqual([User, Twitter]);
  });

  it('isolate internal array from the one returned', () => {
    const copy1 = IndexStore.getAll();
    const copy2 = IndexStore.getAll();
    expect(copy1).toEqual(copy2);
    expect(copy1).not.toBe(copy2);
  });
});
