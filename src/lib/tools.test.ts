import { IPropertiesMetadata } from '../';
import { ICoreOptions } from './core';
import { getId, getIndexMetadata, getPropertiesMetadata } from './metadata-handler';
import { deepFreeze } from './testing-tools.test';
import { buildBulkQuery, getPureMapping, getQueryStructure, instantiateResult } from './tools';

import Mock = jest.Mock;

jest.mock('./metadata-handler');
beforeEach(() => jest.clearAllMocks());

let options: ICoreOptions;

class User {
  id?: string;
  name?: string;
  values?: number[];
  city?: City;
  cities?: City[];
}

class Country {
  name: string;
}

class City {
  name: string;
  country: Country;
}

describe('getPureMapping', () => {
  it('remove class from mapping', () => {
    class Message {}

    const structure: IPropertiesMetadata = {
      msg: { type: 'text', _cls: Message },
      like: { type: 'double' },
      author: {
        type: 'object',
        _cls: class {},
        properties: {
          id: { type: 'text' },
          name: { type: 'text' },
          city: {
            type: 'object',
            _cls: class {},
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    };

    const result = getPureMapping(structure);

    expect(result).toEqual({
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
    });
  });
});

describe('instantiateResult', () => {
  it('returns undefined if source is undefined', () => {
    (getPropertiesMetadata as Mock).mockReturnValue({ any: 'metadata' });
    const result = instantiateResult(User, undefined as any);
    expect(result).toEqual(undefined);
  });

  it('instanciate an object', () => {
    const json: User = deepFreeze({
      name: 'Bob',
      values: [1, 2, 3],
    });

    (getPropertiesMetadata as Mock).mockReturnValue({
      name: { type: 'text' },
      values: { type: 'integer' },
    });

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
  });

  it('instanciate a partial object', () => {
    const json: User = deepFreeze({
      name: 'Bob',
    });

    (getPropertiesMetadata as Mock).mockReturnValue({
      id: { type: 'text' },
      name: { type: 'text' },
      values: { type: 'integer' },
    });

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
  });

  it('instanciate an array of object', () => {
    (getPropertiesMetadata as Mock).mockReturnValue({
      name: { type: 'text' },
    });

    const json: User[] = deepFreeze([{ name: 'Bob' }, { name: 'Tom' }]);

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBeInstanceOf(User);
    expect(result[1]).toBeInstanceOf(User);
  });

  it('instanciate single nested objects', () => {
    (getPropertiesMetadata as Mock).mockReturnValue({
      id: { type: 'keyword' },
      name: { type: 'text' },
      city: {
        type: 'object',
        _cls: City,
        properties: {
          name: { type: 'text' },
          country: {
            type: 'object',
            _cls: Country,
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    });

    const json: User = deepFreeze({
      id: '007',
      name: 'Vincent',
      city: {
        name: 'Martigues',
        country: {
          name: 'France',
        },
      },
    });

    const result = instantiateResult(User, json);

    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
    expect(result.city).toBeInstanceOf(City);
    expect(result.city!.country).toBeInstanceOf(Country);
  });

  it('instanciate array of nested objects', () => {
    (getPropertiesMetadata as Mock).mockReturnValue({
      id: { type: 'keyword' },
      name: { type: 'text' },
      cities: {
        type: 'nested',
        _cls: City,
        properties: {
          name: { type: 'text' },
          country: {
            type: 'object',
            _cls: Country,
            properties: {
              name: { type: 'text' },
            },
          },
        },
      },
    });
    const json: User = deepFreeze({
      id: '007',
      name: 'Vincent',
      cities: [
        {
          name: 'Martigues',
          country: {
            name: 'France',
          },
        },
        {
          name: 'Aix-en-Provence',
          country: {
            name: 'France',
          },
        },
      ],
    });

    const result = instantiateResult(User, json);

    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
    expect(Array.isArray(result.cities)).toBe(true);
    expect(result.cities![0]).toBeInstanceOf(City);
    expect(result.cities![0].country).toBeInstanceOf(Country);
    expect(result.cities![1]).toBeInstanceOf(City);
    expect(result.cities![1].country).toBeInstanceOf(Country);
  });
});

describe('getQueryStructure', () => {
  describe('Primary key based class', () => {
    beforeEach(() => {
      options = { indexPrefix: 'es1_' };
      (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type', primary: 'id' });
      (getId as Mock).mockReturnValue('123');
    });

    it('handles instance', () => {
      const user = new User();
      user.id = '1';
      const query = getQueryStructure(options, user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).toHaveBeenCalledWith(options, User, user);
    });

    it('handles literal', () => {
      const user: User = { id: '1', name: 'Bob' };
      const query = getQueryStructure(options, User, user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).toHaveBeenCalledWith(options, User, user);
    });

    it('handles partial', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(options, User, '123', user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles only class', () => {
      const query = getQueryStructure(options, User);
      expect(query).toEqual({ cls: User, document: undefined, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles class and id', () => {
      const query = getQueryStructure(options, User, '123');
      expect(query).toEqual({ cls: User, document: undefined, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles missing id', () => {
      (getId as Mock).mockReturnValue('');
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(options, User, '', user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).toHaveBeenCalledWith(options, User, user);
    });
  });

  describe('Non primary key based class', () => {
    beforeEach(() => {
      options = { indexPrefix: 'es1_' };
      (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type' });
    });

    it('handles instance', () => {
      const user = new User();
      const query = getQueryStructure(options, user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles literal', () => {
      const user: User = { name: 'Bob' };
      const query = getQueryStructure(options, User, user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles partial', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(options, User, '123', user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles only class', () => {
      const query = getQueryStructure(options, User);
      expect(query).toEqual({ cls: User, document: undefined, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles class and id', () => {
      const query = getQueryStructure(options, User, '123');
      expect(query).toEqual({ cls: User, document: undefined, id: '123', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });

    it('handles missing id', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(options, User, '', user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'a_index', type: 'a_type' });
      expect(getIndexMetadata).toHaveBeenCalledWith(options, User);
      expect(getId).not.toHaveBeenCalled();
    });
  });
});

describe('buildBulkQuery', () => {
  beforeEach(() => {
    options = { indexPrefix: 'es1_' };
    (getId as Mock).mockReturnValue('123');
  });

  describe('Primary key based class', () => {
    beforeEach(() => {
      (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type', primary: 'id' });
    });

    it('build index query', () => {
      const query = buildBulkQuery(options, 'index', User, [{ id: '123', name: 'Bob' }, { id: '124', name: 'Tom' }]);
      expect(query).toEqual({
        body: [
          { index: { _index: 'a_index', _type: 'a_type', _id: '123' } },
          { id: '123', name: 'Bob' },
          { index: { _index: 'a_index', _type: 'a_type', _id: '124' } },
          { id: '124', name: 'Tom' },
        ],
      });
    });
  });

  describe('Non primary key based class', () => {
    beforeEach(() => {
      (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type' });
    });

    it('build index query', () => {
      const query = buildBulkQuery(options, 'index', User, [{ name: 'Bob' }, { name: 'Tom' }]);
      expect(query).toEqual({
        body: [
          { index: { _index: 'a_index', _type: 'a_type' } },
          { name: 'Bob' },
          { index: { _index: 'a_index', _type: 'a_type' } },
          { name: 'Tom' },
        ],
      });
    });
  });

  describe('Primary key is _id', () => {
    beforeEach(() => {
      (getIndexMetadata as Mock).mockReturnValue({ index: 'a_index', type: 'a_type', primary: '_id' });
    });

    it('build index query', () => {
      class Doc {
        _id?: string;
        title: string;
      }
      const query = buildBulkQuery(options, 'index', Doc, [{ _id: '123', title: 'Test' }, { _id: '124', title: 'Test 2' }]);
      expect(query).toEqual({
        body: [
          { index: { _index: 'a_index', _type: 'a_type', _id: '123' } },
          { title: 'Test' },
          { index: { _index: 'a_index', _type: 'a_type', _id: '124' } },
          { title: 'Test 2' },
        ],
      });
    });
  });
});
