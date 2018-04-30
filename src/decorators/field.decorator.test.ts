import { DECORATORS } from '../constants';
import { Field } from './field.decorator';
import { Index } from './index.decorator';

it('handles simple type', () => {
  class User {
    @Field('text') name: string;
    @Field('double') age: number;
  }
  const properties = Reflect.getMetadata(DECORATORS.PROPERTIES, User);

  expect(properties).toEqual({
    name: { type: 'text' },
    age: { type: 'double' },
  });
});
it('handles complexe type definition', () => {
  class User {
    @Field({ type: 'text', copy_to: 'xyz', boost: 2 })
    name: string;
    @Field('double') age: number;
  }
  const properties = Reflect.getMetadata(DECORATORS.PROPERTIES, User);

  expect(properties).toEqual({
    name: { type: 'text', copy_to: 'xyz', boost: 2 },
    age: { type: 'double' },
  });
});

it('handles object type', () => {
  class City {
    @Field('text') name: string;
  }

  class User {
    @Field({ object: City })
    city: City;
  }

  const properties = Reflect.getMetadata(DECORATORS.PROPERTIES, User);

  expect(properties).toEqual({
    city: { type: 'object', _cls: City, properties: { name: { type: 'text' } } },
  });
});

it('handles nested type', () => {
  class City {
    @Field('text') name: string;
  }

  class User {
    @Field({ nested: City })
    cities: City[];
  }

  const properties = Reflect.getMetadata(DECORATORS.PROPERTIES, User);

  expect(properties).toEqual({
    cities: { type: 'nested', _cls: City, properties: { name: { type: 'text' } } },
  });
});

it('handles multiple fields', () => {
  class Article {
    @Field({ type: 'text', fields: { desc_fr: { type: 'text', analyzer: 'french' }, desc_en: { type: 'text', analyzer: 'english' } } })
    description: string;
  }

  const properties = Reflect.getMetadata(DECORATORS.PROPERTIES, Article);

  expect(properties).toEqual({
    description: {
      type: 'text',
      fields: { desc_fr: { type: 'text', analyzer: 'french' }, desc_en: { type: 'text', analyzer: 'english' } },
    },
  });
});

it('throw when declaring using twice the Field decorator on a same property', () => {
  expect(() => {
    class Article {
      @Field('text')
      @Field('keyword')
      description: string;
    }
    return true;
  }).toThrow('Multiple usage of @Field() on Article.description');
});
