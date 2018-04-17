import { Index, IPropertiesMetadata, Primary } from '../';
import { Field } from '../decorators/field.decorator';
import { deepFreeze } from './testing-tools.test';
import { buildBulkQuery, getPureMapping, getQueryStructure, instantiateResult } from './tools';

describe('getPureMapping', () => {
  it('remove class from mapping', () => {
    class Message {}
    class User {}
    class City {}

    const structure: IPropertiesMetadata = {
      msg: { type: 'text', _cls: Message },
      like: { type: 'double' },
      author: {
        type: 'object',
        _cls: User,
        properties: {
          id: { type: 'text' },
          name: { type: 'text' },
          city: {
            type: 'object',
            _cls: City,
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
    @Index()
    class User {
      @Field('text') name: string;
      @Field('integer') values: number[];
    }

    const result = instantiateResult(User, undefined as any);
    expect(result).toEqual(undefined);
  });

  it('instanciate an object', () => {
    @Index()
    class User {
      @Field('text') name: string;
      @Field('integer') values: number[];
    }

    const json: User = deepFreeze({
      name: 'Bob',
      values: [1, 2, 3],
    });

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
  });

  it('instanciate a partial object', () => {
    @Index()
    class User {
      @Field('text') name: string;
      @Field('integer') age: number;
    }

    const json: User = deepFreeze({
      name: 'Bob',
    });

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(result).toBeInstanceOf(User);
  });

  it('instanciate an array of object', () => {
    @Index()
    class User {
      @Field('text') name: string;
    }

    const json: User[] = deepFreeze([{ name: 'Bob' }, { name: 'Tom' }]);

    const result = instantiateResult(User, json);
    expect(result).toEqual(json);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toBeInstanceOf(User);
    expect(result[1]).toBeInstanceOf(User);
  });

  it('instanciate single nested objects', () => {
    class Country {
      @Field('text') name: string;
    }

    class City {
      @Field('text') name: string;
      @Field({ object: Country })
      country: Country;
    }

    @Index()
    class User {
      @Primary()
      @Field('text')
      id: string;
      @Field('text') name: string;
      @Field({ object: City })
      city: City;
    }

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
    expect(result.city.country).toBeInstanceOf(Country);
  });

  it('instanciate array of nested objects', () => {
    class Country {
      @Field('text') name: string;
    }

    class City {
      @Field('text') name: string;
      @Field({ object: Country })
      country: Country;
    }

    @Index()
    class User {
      @Primary()
      @Field('text')
      id: string;
      @Field('text') name: string;
      @Field({ nested: City })
      cities: City[];
    }

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
    expect(result.cities[0]).toBeInstanceOf(City);
    expect(result.cities[0].country).toBeInstanceOf(Country);
    expect(result.cities[1]).toBeInstanceOf(City);
    expect(result.cities[1].country).toBeInstanceOf(Country);
  });
});

describe('getQueryStructure', () => {
  it('throw if class is missing', () => {
    expect(() => getQueryStructure({ id: '123', name: 'Bob' })).toThrow('Index is missing');
  });

  describe('Primary key based class', () => {
    @Index()
    class User {
      @Primary()
      @Field('text')
      id: string;
      @Field('text') name: string;
    }

    it('handles instance', () => {
      const user = new User();
      user.id = '123';
      const query = getQueryStructure(user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'user', type: 'user' });
    });

    it('handles literal', () => {
      const user: User = { id: '123', name: 'Bob' };
      const query = getQueryStructure(User, user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'user', type: 'user' });
    });

    it('handles partial', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(User, '123', user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'user', type: 'user' });
    });

    it('handles only class', () => {
      const query = getQueryStructure(User);
      expect(query).toEqual({ cls: User, document: undefined, id: '', index: 'user', type: 'user' });
    });

    it('handles class and id', () => {
      const query = getQueryStructure(User, '123');
      expect(query).toEqual({ cls: User, document: undefined, id: '123', index: 'user', type: 'user' });
    });

    it('handles missing id', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(User, '', user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'user', type: 'user' });
    });
  });

  describe('Non primary key based class', () => {
    @Index()
    class User {
      @Field('text') name: string;
    }

    it('handles instance', () => {
      const user = new User();
      const query = getQueryStructure(user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'user', type: 'user' });
    });

    it('handles literal', () => {
      const user: User = { name: 'Bob' };
      const query = getQueryStructure(User, user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'user', type: 'user' });
    });

    it('handles partial', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(User, '123', user);
      expect(query).toEqual({ cls: User, document: user, id: '123', index: 'user', type: 'user' });
    });

    it('handles only class', () => {
      const query = getQueryStructure(User);
      expect(query).toEqual({ cls: User, document: undefined, id: '', index: 'user', type: 'user' });
    });

    it('handles class and id', () => {
      const query = getQueryStructure(User, '123');
      expect(query).toEqual({ cls: User, document: undefined, id: '123', index: 'user', type: 'user' });
    });

    it('handles missing id', () => {
      const user: Partial<User> = { name: 'Bob' };
      const query = getQueryStructure(User, '', user);
      expect(query).toEqual({ cls: User, document: user, id: '', index: 'user', type: 'user' });
    });
  });
});

describe('buildBulkQuery', () => {
  describe('Primary key based class', () => {
    @Index()
    class User {
      @Primary()
      @Field('text')
      id: string;
      @Field('text') name: string;
    }

    it('build index query', () => {
      const query = buildBulkQuery('index', User, [{ id: '123', name: 'Bob' }, { id: '124', name: 'Tom' }]);
      expect(query).toEqual({
        body: [
          { index: { _index: 'user', _type: 'user', _id: '123' } },
          { id: '123', name: 'Bob' },
          { index: { _index: 'user', _type: 'user', _id: '124' } },
          { id: '124', name: 'Tom' },
        ],
      });
    });
  });

  describe('Non primary key based class', () => {
    @Index()
    class User {
      @Field('text') name: string;
    }

    it('build index query', () => {
      const query = buildBulkQuery('index', User, [{ name: 'Bob' }, { name: 'Tom' }]);
      expect(query).toEqual({
        body: [{ index: { _index: 'user', _type: 'user' } }, { name: 'Bob' }, { index: { _index: 'user', _type: 'user' } }, { name: 'Tom' }],
      });
    });
  });
});
