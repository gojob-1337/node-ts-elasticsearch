import * as es from 'elasticsearch';
import { Elasticsearch } from './elasticsearch';
import { Indices } from './indices';

jest.mock('elasticsearch', () => {
  const jestConstructor = jest.fn();

  class Client {
    constructor(params: any) {
      jestConstructor(params);
    }
  }

  return {
    jestConstructor,
    Client,
  };
});

beforeEach(() => jest.clearAllMocks());

it('use instanciated client', () => {
  const client = new es.Client({ host: 'localhost' });
  const service = new Elasticsearch(client);
  expect((service as any).client).toBe(client);
  expect((es as any).jestConstructor).toHaveBeenCalledTimes(1);
});

it('instanciate a Client with passed parameters', () => {
  const params = { host: 'localhost' };
  const service = new Elasticsearch(params);
  expect((service as any).client).toBeInstanceOf(es.Client);
  expect((es as any).jestConstructor).toHaveBeenCalledTimes(1);
  expect((es as any).jestConstructor).toHaveBeenCalledWith(params);
});

it('instanciate Indices with the internal client', () => {
  const service = new Elasticsearch({});
  expect(service.indices).toBeInstanceOf(Indices);
  expect((service.indices as any).client).toBe((service as any).client);
});
