import { Field } from '../decorators/field.decorator';
import { Index } from '../decorators/index.decorator';
import { Primary } from '../decorators/primary.decorator';
import { getId, getIndexMetadata, getPropertiesMetadata } from './metadata-handler';

@Index({ settings: { xyz: 1 } })
class Twitter {
  @Primary()
  @Field('text')
  id: string;
  @Field('text') msg: string;
  @Field('double') like: number;
}

describe('getIndexMetadata', () => {
  it('return index metadata', async () => {
    const meta = getIndexMetadata(Twitter);
    expect(meta).toEqual({ index: 'twitter', type: 'twitter', primary: 'id', settings: { xyz: 1 } });
  });

  it('throw when non having metadata', async () => {
    class Test {}
    expect(() => getIndexMetadata(Test)).toThrow('Index is missing');
  });
});

describe('getPropertiesMetadata', () => {
  it('return index metadata', async () => {
    const meta = getPropertiesMetadata(Twitter);
    expect(meta).toEqual({
      id: { type: 'text' },
      msg: { type: 'text' },
      like: { type: 'double' },
    });
  });

  it('throw when non having metadata', async () => {
    class Test {}
    expect(() => getPropertiesMetadata(Test)).toThrow('Properties are missing');
  });
});

describe('getId', () => {
  it('extract id from instance', () => {
    const twt = new Twitter();
    twt.id = 'AZERTY';
    expect(getId(twt)).toBe('AZERTY');
  });

  it('extract undefined id from instance', () => {
    expect(getId(new Twitter())).toBe(undefined);
  });

  it('extract id a literal', () => {
    expect(getId(Twitter, { id: 'AZERTY' })).toBe('AZERTY');
  });

  it('extract undefined id from a literal', () => {
    expect(getId(Twitter, {})).toBe(undefined);
  });

  it('throw if class is not defined', () => {
    @Index()
    class Test {}
    expect(() => getId(new Test())).toThrow('Primary not defined for class Test');
  });
});
