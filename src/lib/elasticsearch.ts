import * as es from 'elasticsearch';
import { Core } from './core';
import { Indices } from './indices';

export class Elasticsearch extends Core {
  public indices: Indices;
  constructor(clientOrParams: es.Client | es.ConfigOptions) {
    let client: es.Client;

    if (clientOrParams.constructor && clientOrParams instanceof es.Client) {
      client = clientOrParams as es.Client;
    } else {
      client = new es.Client(clientOrParams as es.ConfigOptions);
    }

    super(client);

    this.indices = new Indices(client);
  }
}
