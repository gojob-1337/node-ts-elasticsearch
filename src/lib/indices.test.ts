import { Field } from '../decorators/field.decorator';
import { Index } from '../decorators/index.decorator';
import { IndexedIndicesFlushParams, Indices } from './indices';

class City {
  @Field('text') name: string;
}

class User {
  @Field('text') id: string;
  @Field('text') name: string;
  @Field({ object: City })
  city: City;
}

@Index({ settings: { xyz: 1 } })
class Twitter {
  @Field('text') msg: string;
  @Field('double') like: number;

  @Field({ object: User })
  author: User;
}

beforeEach(() => jest.clearAllMocks());

describe('create', () => {
  it('calls indices.create', async () => {
    const client = { indices: { create: jest.fn() } };
    const indices = new Indices(client as any);
    await indices.create(Twitter);
    expect(client.indices.create).toHaveBeenCalledTimes(1);
    expect(client.indices.create).toHaveBeenCalledWith({ index: 'twitter', body: { xyz: 1 } });
  });
});

describe('delete', () => {
  it('calls indices.delete', async () => {
    const client = { indices: { delete: jest.fn() } };
    const indices = new Indices(client as any);
    await indices.delete(Twitter);
    expect(client.indices.delete).toHaveBeenCalledTimes(1);
    expect(client.indices.delete).toHaveBeenCalledWith({ index: 'twitter' });
  });
});

describe('exists', () => {
  it('calls indices.exists', async () => {
    const bool = Symbol();
    const client = { indices: { exists: jest.fn().mockReturnValue(bool) } };
    const indices = new Indices(client as any);
    const result = await indices.exists(Twitter);
    expect(result).toBe(bool);

    expect(client.indices.exists).toHaveBeenCalledTimes(1);
    expect(client.indices.exists).toHaveBeenCalledWith({ index: 'twitter' });
  });
});

describe('flush', () => {
  const client: any = { indices: { flush: jest.fn() } };
  const indices = new Indices(client);

  it('flushes from class', async () => {
    await indices.flush(Twitter);
    expect(client.indices.flush).toHaveBeenCalledTimes(1);
    expect(client.indices.flush).toHaveBeenCalledWith({ index: 'twitter' });
  });

  it('flushes using custom params', async () => {
    const params: IndexedIndicesFlushParams = { body: { query: { match_all: {} } } };
    await indices.flush(Twitter, params);
    expect(client.indices.flush).toHaveBeenCalledTimes(1);
    expect(client.indices.flush).toHaveBeenCalledWith({ index: 'twitter', body: { query: { match_all: {} } } });
  });

  it('returns the client result', async () => {
    const response = { xyz: 1 };
    client.indices.flush = jest.fn().mockResolvedValue(response);
    const result = await indices.flush(Twitter);
    expect(result).toBe(response);
  });
});

describe('putMapping', () => {
  it('calls indices.putMapping using a class', async () => {
    const client = { indices: { putMapping: jest.fn() } };
    const indices = new Indices(client as any);
    await indices.putMapping(Twitter);
    expect(client.indices.putMapping).toHaveBeenCalledTimes(1);
    expect(client.indices.putMapping).toHaveBeenCalledWith({
      index: 'twitter',
      type: 'twitter',
      body: {
        dynamic: 'strict',
        properties: {
          msg: { type: 'text' },
          like: { type: 'double' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'text' },
              name: { type: 'text' },
              city: {
                type: 'object',
                properties: {
                  name: { type: 'text' },
                },
              },
            },
          },
        },
      },
    });
  });
});

describe('refresh', () => {
  it('calls indices.refresh', async () => {
    const client = { indices: { refresh: jest.fn() } };
    const indices = new Indices(client as any);
    await indices.refresh(Twitter);
    expect(client.indices.refresh).toHaveBeenCalledTimes(1);
    expect(client.indices.refresh).toHaveBeenCalledWith({ index: 'twitter' });
  });
});
