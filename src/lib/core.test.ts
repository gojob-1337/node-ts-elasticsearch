import * as es from 'elasticsearch';
import { Readable } from 'stream';
import Mock = jest.Mock;

import { Field, Index, Primary } from '../';
import { BULK_ITEMS_COUNT_MAX, Core, ICoreOptions } from './core';
import { IndexStore } from './index-store';
import { deepFreeze } from './testing-tools.test';

import * as tools from './tools';
jest.mock('./tools');

beforeEach(() => jest.clearAllMocks());

let client: es.Client;
let core: Core;
let coreOptions: ICoreOptions;

@Index()
class User {
  @Primary()
  @Field('text')
  user_id: string;

  @Field('text') name: string;
  @Field('integer') age: number;
}

@Index()
class Lambda {
  @Field('integer') value: number;
}

beforeEach(() => {
  coreOptions = { indexPrefix: 'es1_' };
  client = {} as es.Client;
  core = new Core(client, coreOptions);
});

describe('bulkIndex', () => {
  it('calls bulk using array of documents', async () => {
    const query = { body: {} };
    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockReturnValue(query);

    await core.bulkIndex(User, [{ user_id: '123', name: 'Bob', age: 13 }, { user_id: '124', name: 'Tom', age: 14 }]);
    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledWith(query);

    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(1);
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(coreOptions, 'index', User, [
      { user_id: '123', name: 'Bob', age: 13 },
      { user_id: '124', name: 'Tom', age: 14 },
    ]);
  });

  it('calls bulk using readable stream', async () => {
    const query = { body: {} };
    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockReturnValue(query);

    const stream = new Readable({ objectMode: true });
    stream.push({ user_id: '123', name: 'Bob', age: 13 });
    stream.push({ user_id: '124', name: 'Tom', age: 14 });
    stream.push(null);

    await core.bulkIndex(User, stream);

    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(1);
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(coreOptions, 'index', User, [
      { user_id: '123', name: 'Bob', age: 13 },
      { user_id: '124', name: 'Tom', age: 14 },
    ]);

    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledWith(query);
  });

  it('paginate bulks', async () => {
    const source: Array<Partial<User>> = [];
    for (let i = 0; i < 1 + 2 * BULK_ITEMS_COUNT_MAX; i++) {
      source.push({ age: i });
    }

    const query = { body: {} };
    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockReturnValue(query);

    await core.bulkIndex(User, source);

    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(3);
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(coreOptions, 'index', User, source.slice(0, BULK_ITEMS_COUNT_MAX));
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(coreOptions, 'index', User, source.slice(BULK_ITEMS_COUNT_MAX, 2 * BULK_ITEMS_COUNT_MAX));
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(
      coreOptions,
      'index',
      User,
      source.slice(2 * BULK_ITEMS_COUNT_MAX, 2 * BULK_ITEMS_COUNT_MAX + 1),
    );

    expect(client.bulk).toHaveBeenCalledTimes(3);
    expect(client.bulk).toHaveBeenCalledWith(query);
  });

  it('handle the special case of ending on a single paginated bulk', async () => {
    const source: Array<Partial<User>> = [];
    for (let i = 0; i < BULK_ITEMS_COUNT_MAX; i++) {
      source.push({ age: i });
    }

    const query = { body: {} };
    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockReturnValue(query);

    await core.bulkIndex(User, source);

    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(1);
    expect(tools.buildBulkQuery).toHaveBeenCalledWith(coreOptions, 'index', User, source);

    expect(client.bulk).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledWith(query);
  });

  it('ends on first error', async () => {
    const source: Array<Partial<User>> = [];
    for (let i = 0; i < 1 + 2 * BULK_ITEMS_COUNT_MAX; i++) {
      source.push({ age: i });
    }

    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockImplementation(() => {
      throw new Error('Any error');
    });

    expect.assertions(3);
    try {
      await core.bulkIndex(User, source);
    } catch (err) {
      expect(err).toEqual(new Error('Any error'));
    }
    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(1);
    expect(client.bulk).toHaveBeenCalledTimes(0);
  });

  it('handle readable stream error', async () => {
    class ThrowingThread extends Readable {
      constructor() {
        super({ objectMode: true });
      }

      _read(): void {}

      throw(): void {
        this.emit('error', new Error('Any error'));
      }
    }

    const query = { body: {} };
    client.bulk = jest.fn();
    (tools.buildBulkQuery as Mock).mockReturnValue(query);

    const stream = new ThrowingThread();
    setTimeout(() => stream.throw(), 10);

    expect.assertions(3);
    try {
      await core.bulkIndex(User, stream);
    } catch (err) {
      expect(err).toEqual(new Error('Any error'));
    }
    expect(tools.buildBulkQuery).toHaveBeenCalledTimes(0);
    expect(client.bulk).toHaveBeenCalledTimes(0);
  });
});

describe('close', () => {
  beforeEach(() => (client.close = jest.fn()));

  it('close the connection', async () => {
    await core.close();
    expect(client.close).toHaveBeenCalledTimes(1);
    expect(client.close).toHaveBeenCalledWith();
  });
});

describe('count', () => {
  beforeEach(() => (client.count = jest.fn()));

  it('calls client.count', async () => {
    await core.count(User);
    expect(client.count).toHaveBeenCalledTimes(1);
    expect(client.count).toHaveBeenCalledWith({ index: 'es1_user', type: 'user' });
  });

  it('mixes class and query', async () => {
    await core.count(User, { body: { query: { match_all: {} } } });
    expect(client.count).toHaveBeenCalledTimes(1);
    expect(client.count).toHaveBeenCalledWith({ index: 'es1_user', type: 'user', body: { query: { match_all: {} } } });
  });

  it('handle original query', async () => {
    await core.count({ index: 'test', body: { query: { match_all: {} } } });
    expect(client.count).toHaveBeenCalledTimes(1);
    expect(client.count).toHaveBeenCalledWith({ index: 'test', body: { query: { match_all: {} } } });
  });

  it('returns whatever it get', async () => {
    const response = { count: 123 };
    client.count = jest.fn().mockReturnValue(response);
    const result = await core.count(User);
    expect(result).toBe(response);
  });
});

describe('create', () => {
  beforeEach(() => (client.create = jest.fn()));

  it('calls client.create', async () => {
    const user = {};
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', cls: User, document: { name: 'Bob' } });
    await core.create(User, 'xyz', user);
    expect(tools.getQueryStructure).toHaveBeenCalledTimes(1);
    expect(tools.getQueryStructure).toHaveBeenCalledWith(coreOptions, User, 'xyz', user);
    expect(client.create).toHaveBeenCalledTimes(1);
    expect(client.create).toHaveBeenCalledWith({ index: 'idx', type: 'tp', id: '123', body: { name: 'Bob' } });
  });

  it('throws when document is missing', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', document: undefined });
    expect.assertions(1);
    try {
      await core.create(User);
    } catch (err) {
      expect(err).toEqual(new Error('Document is missing'));
    }
  });
});

describe('delete', () => {
  beforeEach(() => (client.delete = jest.fn()));

  it('calls client.delete', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', cls: User });
    await core.delete(User, 'xyz');
    expect(tools.getQueryStructure).toHaveBeenCalledTimes(1);
    expect(tools.getQueryStructure).toHaveBeenCalledWith(coreOptions, User, 'xyz');
    expect(client.delete).toHaveBeenCalledTimes(1);
    expect(client.delete).toHaveBeenCalledWith({ index: 'idx', type: 'tp', id: '123' });
  });

  it('throws when id is missing', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '', cls: User });
    expect.assertions(1);
    try {
      await core.delete(User);
    } catch (err) {
      expect(err).toEqual(new Error('ID is missing when deleting a User'));
    }
  });
});

describe('get', () => {
  beforeEach(() => {
    client.get = jest.fn().mockReturnValue({});
    // simple assign, does not create nested objects
    (tools.instantiateResult as Mock).mockImplementation((cls: any, source: any) => {
      if (source) {
        return Object.assign(new cls(), source);
      }
    });
  });

  it('return an instance from an id', async () => {
    const user = new User();
    const response: any = deepFreeze({ _source: { user_id: '1234', name: 'Bob', age: 13 } });
    client.get = jest.fn().mockReturnValue(response);
    (tools.instantiateResult as Mock).mockReturnValue(user);

    const result = await core.get(User, '1234');
    expect(result.response).toBe(response);
    expect(result.document).toBe(user);

    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith({ index: 'es1_user', type: 'user', id: '1234' });
    expect(tools.instantiateResult).toHaveBeenCalledTimes(1);
    expect(tools.instantiateResult).toHaveBeenCalledWith(User, response._source);
  });

  it('should handle not found', async () => {
    const response: any = { found: false };
    client.get = jest.fn().mockReturnValue(response);
    const result = await core.get(User, '1234');
    expect(result.response).toBe(response);
    expect(result.document).toBe(undefined);
  });

  it('handle complex query', async () => {
    await core.get(User, { id: '456', ignore: 404 });
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith({ index: 'es1_user', type: 'user', id: '456', ignore: 404 });
  });
});

describe('getIndices', () => {
  it('return stored indices', () => {
    const indices: any = [{}, {}];
    const spy = jest.spyOn(IndexStore, 'getAll');
    spy.mockReturnValue(indices);

    expect(Core.getIndices()).toBe(indices);
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('index', () => {
  beforeEach(() => (client.index = jest.fn()));

  it('calls client.index', async () => {
    const user = {};
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', cls: User, document: { name: 'Bob' } });
    await core.index(User, 'xyz', user);
    expect(tools.getQueryStructure).toHaveBeenCalledTimes(1);
    expect(tools.getQueryStructure).toHaveBeenCalledWith(coreOptions, User, 'xyz', user);
    expect(client.index).toHaveBeenCalledTimes(1);
    expect(client.index).toHaveBeenCalledWith({ index: 'idx', type: 'tp', id: '123', body: { name: 'Bob' } });
  });

  it('throws when document is missing', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', document: undefined });
    expect.assertions(1);
    try {
      await core.index(User);
    } catch (err) {
      expect(err).toEqual(new Error('Document is missing'));
    }
  });
});

describe('scroll', () => {
  beforeEach(() => {
    client.scroll = jest.fn().mockReturnValue({ hits: { hits: [] } });
    // simple assign, does not create nested objects
    (tools.instantiateResult as Mock).mockImplementation((cls: any, source: any) => {
      if (source) {
        return Object.assign(new cls(), source);
      }
    });
  });

  it('returns instances', async () => {
    const response: any = deepFreeze({
      hits: {
        hits: [{ _source: { user_id: '123', name: 'Bob', age: 13 } }, { _source: { user_id: '456', name: 'Tom', age: 14 } }],
      },
    });
    const params: any = deepFreeze({ scrollId: '123', scroll: '30s' });

    client.scroll = jest.fn().mockReturnValue(response);

    const result = await core.scroll(User, params);

    expect(result.response).toBe(response);
    expect(result.documents).toEqual([{ age: 13, name: 'Bob', user_id: '123' }, { age: 14, name: 'Tom', user_id: '456' }]);
    expect(result.documents[0]).toBeInstanceOf(User);
    expect(result.documents[1]).toBeInstanceOf(User);
    expect(client.scroll).toHaveBeenCalledTimes(1);
    expect(client.scroll).toHaveBeenCalledWith(params);
    expect(tools.instantiateResult).toHaveBeenCalledTimes(2);
    expect(tools.instantiateResult).toHaveBeenCalledWith(User, { user_id: '123', name: 'Bob', age: 13 });
    expect(tools.instantiateResult).toHaveBeenCalledWith(User, { user_id: '456', name: 'Tom', age: 14 });
  });

  it('should handle empty result', async () => {
    const result = await core.scroll(User, { scrollId: '123', scroll: '30s' });
    expect(result.documents).toEqual([]);
  });
});

describe('search', () => {
  beforeEach(() => {
    client.search = jest.fn().mockReturnValue({ hits: { hits: [] } });
    // simple assign, does not create nested objects
    (tools.instantiateResult as Mock).mockImplementation((cls: any, source: any) => {
      if (source) {
        return Object.assign(new cls(), source);
      }
    });
  });

  it('returns instances', async () => {
    const response: any = deepFreeze({
      hits: {
        hits: [{ _source: { user_id: '123', name: 'Bob', age: 13 } }, { _source: { user_id: '456', name: 'Tom', age: 14 } }],
      },
    });
    const query: any = deepFreeze({ body: { query: { match_all: {} } } });

    client.search = jest.fn().mockReturnValue(response);

    const result = await core.search<User>(User, query);

    expect(result.response).toBe(response);
    expect(result.documents).toEqual([{ age: 13, name: 'Bob', user_id: '123' }, { age: 14, name: 'Tom', user_id: '456' }]);
    expect(result.documents[0]).toBeInstanceOf(User);
    expect(result.documents[1]).toBeInstanceOf(User);
    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith({ index: 'es1_user', type: 'user', ...query });
    expect(tools.instantiateResult).toHaveBeenCalledTimes(2);
    expect(tools.instantiateResult).toHaveBeenCalledWith(User, { user_id: '123', name: 'Bob', age: 13 });
    expect(tools.instantiateResult).toHaveBeenCalledWith(User, { user_id: '456', name: 'Tom', age: 14 });
  });

  it('should handle empty result', async () => {
    const result = await core.search(User, {});
    expect(result.documents).toEqual([]);
  });
});

describe('update', () => {
  beforeEach(() => (client.update = jest.fn()));

  it('calls client.update', async () => {
    const user = {};
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', cls: User, document: { name: 'Bob' } });
    await core.update(User, 'xyz', user);
    expect(tools.getQueryStructure).toHaveBeenCalledTimes(1);
    expect(tools.getQueryStructure).toHaveBeenCalledWith(coreOptions, User, 'xyz', user);
    expect(client.update).toHaveBeenCalledTimes(1);
    expect(client.update).toHaveBeenCalledWith({ index: 'idx', type: 'tp', id: '123', body: { doc: { name: 'Bob' } } });
  });

  it('throws when document is missing', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '123', cls: User, document: undefined });
    expect.assertions(1);
    try {
      await core.update(User);
    } catch (err) {
      expect(err).toEqual(new Error('Document is missing'));
    }
  });

  it('throws when id is missing', async () => {
    (tools.getQueryStructure as Mock).mockReturnValue({ index: 'idx', type: 'tp', id: '', cls: User, document: {} });
    expect.assertions(1);
    try {
      await core.update(User);
    } catch (err) {
      expect(err).toEqual(new Error('ID is missing when updating a User'));
    }
  });
});
