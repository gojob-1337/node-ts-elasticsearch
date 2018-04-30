import { DECORATORS } from '../constants';
import { getId, getIndexMetadata, getPropertiesMetadata } from './metadata-handler';

class Twitter {
  id?: string;
}

describe('getIndexMetadata', () => {
  it('return index metadata', async () => {
    const metadata = { index: 'a_index', type: 'a_type', any: 'thing' };
    Reflect.getMetadata = jest.fn().mockReturnValue(metadata);
    const result = getIndexMetadata({}, Twitter);
    expect(result).toEqual(metadata);
    expect(result).not.toBe(metadata);
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.INDEX, Twitter);
  });

  it('return index metadata with index prefix', async () => {
    const metadata = { index: 'a_index', type: 'a_type', any: 'thing' };
    Reflect.getMetadata = jest.fn().mockReturnValue(metadata);
    const meta = getIndexMetadata({ indexPrefix: 'es1_' }, Twitter);
    expect(meta).toEqual({ index: 'es1_a_index', type: 'a_type', any: 'thing' });
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.INDEX, Twitter);
    expect(metadata.index).toEqual('a_index'); // check original is not modified
  });

  it('throw when non having metadata', async () => {
    Reflect.getMetadata = jest.fn().mockReturnValue(undefined);
    expect(() => getIndexMetadata({}, Twitter)).toThrow('Index is missing');
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.INDEX, Twitter);
  });
});

describe('getPropertiesMetadata', () => {
  it('return index metadata', async () => {
    const properties = { id: { type: 'text' } };
    Reflect.getMetadata = jest.fn().mockReturnValue(properties);
    const meta = getPropertiesMetadata(Twitter);
    expect(meta).toEqual(properties);
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.PROPERTIES, Twitter);
  });

  it('throw when non having metadata', async () => {
    Reflect.getMetadata = jest.fn().mockReturnValue(undefined);
    expect(() => getPropertiesMetadata(Twitter)).toThrow('Properties are missing');
  });
});

describe('getId', () => {
  beforeEach(() => (Reflect.getMetadata = jest.fn().mockReturnValue({ index: 'a_index', type: 'a_type', primary: 'id' })));

  it('extract id from instance', () => {
    const options = { indexPrefix: 'es1_' };
    const twt = new Twitter();
    twt.id = 'AZERTY';
    expect(getId(options, twt)).toBe('AZERTY');
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.INDEX, Twitter);
  });

  it('extract undefined id from instance', () => {
    expect(getId({}, {})).toBe(undefined);
  });

  it('extract id a literal', () => {
    const options = { indexPrefix: 'es1_' };
    expect(getId(options, Twitter, { id: 'AZERTY' })).toBe('AZERTY');
    expect(Reflect.getMetadata).toHaveBeenCalledWith(DECORATORS.INDEX, Twitter);
  });

  it('extract undefined id from a literal', () => {
    expect(getId({}, Twitter, {})).toBe(undefined);
  });

  it('throw if class is not defined', () => {
    Reflect.getMetadata = jest.fn().mockReturnValue({ index: 'a_index', type: 'a_type' });
    expect(() => getId({}, new Twitter())).toThrow('Primary not defined for class Twitter');
  });
});
