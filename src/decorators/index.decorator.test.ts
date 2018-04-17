import { DECORATORS } from '../constants';
import { Index } from './index.decorator';

describe('pathOrOptions as string', () => {
  it('uses class name as index and type', () => {
    @Index()
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({ index: 'tweet', type: 'tweet' });
  });

  it('uses explicit index and type in lower case', () => {
    @Index('TweeTer/Twt')
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({ index: 'tweeter', type: 'twt' });
  });

  it('uses explicit index and implicit type', () => {
    @Index('twt')
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({ index: 'twt', type: 'twt' });
  });

  it('uses explicit index and options settings', () => {
    const settings = {
      number_of_shards: 3,
    };

    @Index('tweeter/twt', { settings })
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({
      index: 'tweeter',
      type: 'twt',
      settings: {
        number_of_shards: 3,
      },
    });
  });
});

describe('only options object', () => {
  it('uses implicit index', () => {
    const settings = {
      number_of_shards: 3,
    };

    @Index({ settings })
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({
      index: 'tweet',
      type: 'tweet',
      settings: {
        number_of_shards: 3,
      },
    });
  });

  it('uses explicit index', () => {
    const settings = {
      number_of_shards: 3,
    };

    @Index({ index: 'twitter', type: 'twt', settings })
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({
      index: 'twitter',
      type: 'twt',
      settings: {
        number_of_shards: 3,
      },
    });
  });

  it('uses explicit index ans implicit type', () => {
    const settings = {
      number_of_shards: 3,
    };

    @Index({ index: 'twt', settings })
    class Tweet {}

    const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
    expect(index).toEqual({
      index: 'twt',
      type: 'twt',
      settings: {
        number_of_shards: 3,
      },
    });
  });
});

describe('requires index', () => {
  it('throw if index is missing', () => {
    expect(() => {
      @Index('/type')
      class Tweet {}
    }).toThrow('Index undefined');
  });
});
