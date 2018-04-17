import { DECORATORS } from '../constants';
import { Index } from './index.decorator';
import { Primary } from './primary.decorator';

it('define primary key', () => {
  @Index()
  class Tweet {
    @Primary() id: string;
  }

  const index = Reflect.getMetadata(DECORATORS.INDEX, Tweet);
  expect(index).toEqual({ index: 'tweet', type: 'tweet', primary: 'id' });
});

it('throw when defining multiple primaries keys', () => {
  expect.assertions(1);
  try {
    @Index()
    class Tweet {
      @Primary() id: string;
      @Primary() second: string;
    }
  } catch (err) {
    expect(err).toBeDefined();
  }
});
