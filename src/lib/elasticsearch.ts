import * as es from 'elasticsearch';

import { Core, ICoreOptions } from './core';
import { Indices } from './indices';

export interface IConfigOptions extends es.ConfigOptions {
  indexPrefix?: string;
  client?: es.Client;
}

export class Elasticsearch extends Core {
  /**
   * Split IConfigOptions into ConfigOptions and ICoreOptions
   * @param options
   */
  private static splitOptions(options: IConfigOptions): { clientOptions: es.ConfigOptions; coreOptions: ICoreOptions } {
    const coreOptions: ICoreOptions = {};
    const clientOptions = { ...options };

    delete clientOptions.indexPrefix;
    delete clientOptions.client;

    coreOptions.indexPrefix = options.indexPrefix;

    return { clientOptions, coreOptions };
  }
  public indices: Indices;

  constructor(clientOrOptions: es.Client | IConfigOptions) {
    let client: es.Client;
    let coreOptions: ICoreOptions = {};
    let clientOptions: es.ConfigOptions = {};

    if (clientOrOptions.constructor && clientOrOptions instanceof es.Client) {
      client = clientOrOptions as es.Client;
    } else {
      const options: IConfigOptions = clientOrOptions as IConfigOptions;
      ({ coreOptions, clientOptions } = Elasticsearch.splitOptions(options));
      client = options.client || new es.Client(clientOptions);
    }

    super(client, coreOptions);
    this.indices = new Indices(client, coreOptions);
  }
}
