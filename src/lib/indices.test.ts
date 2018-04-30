import { Field } from '../decorators/field.decorator';
import { Index } from '../decorators/index.decorator';
import { IndexedIndicesFlushParams, Indices } from './indices';
import { getIndexMetadata, getPropertiesMetadata } from './metadata-handler';
import { getPureMapping } from './tools';
import Mock = jest.Mock;

jest.mock('./metadata-handler');
jest.mock('./tools');

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

beforeEach(() => {
  jest.clearAllMocks();
  (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type', settings: { any: 'thing' }, unwanted: 'value' });
});

describe('create', () => {
  it('calls indices.create', async () => {
    const options = { indexPrefix: 'es1_' };
    const client = { indices: { create: jest.fn() } };
    const indices = new Indices(client as any, options);
    await indices.create(Twitter);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.create).toHaveBeenCalledWith({ index: 'a_index', body: { any: 'thing' } });
  });
});

describe('delete', () => {
  it('calls indices.delete', async () => {
    const options = { indexPrefix: 'es1_' };
    const client = { indices: { delete: jest.fn() } };
    const indices = new Indices(client as any, options);
    await indices.delete(Twitter);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.delete).toHaveBeenCalledWith({ index: 'a_index' });
  });
});

describe('exists', () => {
  it('calls indices.exists', async () => {
    const options = { indexPrefix: 'es1_' };
    const bool = Symbol();
    const client = { indices: { exists: jest.fn().mockReturnValue(bool) } };
    const indices = new Indices(client as any, options);
    const result = await indices.exists(Twitter);
    expect(result).toBe(bool);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.exists).toHaveBeenCalledWith({ index: 'a_index' });
  });
});

describe('flush', () => {
  const options = { indexPrefix: 'es1_' };
  const client: any = { indices: { flush: jest.fn() } };
  const indices = new Indices(client, options);

  it('flushes from class', async () => {
    await indices.flush(Twitter);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.flush).toHaveBeenCalledWith({ index: 'a_index' });
  });

  it('flushes using custom params', async () => {
    const params: IndexedIndicesFlushParams = { body: { query: { match_all: {} } } };
    await indices.flush(Twitter, params);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.flush).toHaveBeenCalledWith({ index: 'a_index', body: { query: { match_all: {} } } });
  });

  it('returns the client result', async () => {
    const response = { xyz: 1 };
    client.indices.flush = jest.fn().mockResolvedValue(response);
    const result = await indices.flush(Twitter);
    expect(result).toBe(response);
  });
});

describe('putMapping', () => {
  const options = { indexPrefix: 'es1_' };
  it('calls indices.putMapping using a class', async () => {
    const fieldsMetadata = { any: 'metadata' };
    (getPropertiesMetadata as Mock).mockReturnValue(fieldsMetadata);
    const properties = {
      msg: { type: 'text' },
      like: { type: 'double' },
    };
    (getPureMapping as Mock).mockReturnValue(properties);
    const client = { indices: { putMapping: jest.fn() } };
    const indices = new Indices(client as any, options);
    await indices.putMapping(Twitter);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(getPropertiesMetadata).toHaveBeenCalledWith(Twitter);
    expect(getPureMapping).toHaveBeenCalledWith(fieldsMetadata);
    expect(client.indices.putMapping).toHaveBeenCalledWith({ index: 'a_index', type: 'a_type', body: { dynamic: 'strict', properties } });
  });
});

describe('refresh', () => {
  it('calls indices.refresh', async () => {
    const options = { indexPrefix: 'es1_' };
    const client = { indices: { refresh: jest.fn() } };
    const indices = new Indices(client as any, options);
    await indices.refresh(Twitter);
    expect(getIndexMetadata).toHaveBeenCalledWith(options, Twitter);
    expect(client.indices.refresh).toHaveBeenCalledWith({ index: 'a_index' });
  });
});
