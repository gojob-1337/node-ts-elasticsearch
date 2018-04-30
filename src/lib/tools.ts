import { IFieldStructure, IPropertiesMetadata } from '../decorators/field.decorator';
import { IndexedClass } from '../types';
import { ICoreOptions } from './core';
import { getId, getIndexMetadata, getPropertiesMetadata } from './metadata-handler';

/**
 * Returns the metadata removing all non targeting elasticsearch data
 */
export function getPureMapping(metadata: IPropertiesMetadata) {
  return Object.keys(metadata).reduce((mapping: IPropertiesMetadata, name: string) => {
    const structure = metadata[name];
    const copy = { ...structure };
    if (copy._cls) {
      delete copy._cls;
    }
    if (copy.properties) {
      copy.properties = getPureMapping(copy.properties);
    }
    mapping[name] = copy;
    return mapping;
  }, {});
}

/**
 * Returns a data depending on the field structure
 * If the field regards a class, it instantiate it recursively
 */
function getStructuredData(structure: IFieldStructure, source: any): any {
  if (!structure._cls || !structure.properties || !source) {
    return source;
  }

  // ts note: when _cls is set, fields is set (see field.decorator.ts)
  const properties: IPropertiesMetadata = structure.properties;

  if (structure.type === 'nested') {
    return source.map((item: any) => getStructuredData({ ...structure, ...{ type: 'object' } }, item));
  }

  return Object.keys(properties).reduce((instance: any, name: string) => {
    if (source[name] !== undefined) {
      instance[name] = getStructuredData(properties[name], source[name]);
    }
    return instance;
  }, new structure._cls());
}

/**
 * Instantiates a class and populate its data using the literal source
 * @param cls Class decorated by @Index
 * @param source Literal object to populate the returned instance
 */
export function instantiateResult<T>(cls: IndexedClass<T>, source: Partial<T>): T;
export function instantiateResult<T>(cls: IndexedClass<T>, source: Array<Partial<T>>): T[];
export function instantiateResult<T>(cls: IndexedClass<T>, source: Partial<T> | Array<Partial<T>>): T | T[] {
  return getStructuredData({ type: Array.isArray(source) ? 'nested' : 'object', _cls: cls, properties: getPropertiesMetadata(cls) }, source);
}

export interface IQueryStructure<T> {
  cls: IndexedClass<T>;
  document?: Partial<T>;
  id: string;
  index: string;
  type: string;
}

/**
 * Returned structured parameters for ES query from various types
 * @param coreOptions Core options
 * @param docOrClass
 * @param docOrId
 * @param doc
 */
export function getQueryStructure<T>(
  coreOptions: ICoreOptions,
  docOrClass: T | IndexedClass<T>,
  docOrId?: Partial<T> | string,
  doc?: Partial<T>,
): IQueryStructure<T> {
  let document: Partial<T> | undefined = doc;
  let cls: IndexedClass<T>;
  let id: string | undefined;

  if (docOrId) {
    if (typeof docOrId === 'string') {
      id = docOrId;
    } else {
      document = docOrId as Partial<T>;
    }
  }

  if (typeof docOrClass === 'function') {
    cls = docOrClass as IndexedClass<T>;
  } else {
    document = docOrClass as T;
    cls = document.constructor as IndexedClass<T>;
  }

  const metadata = getIndexMetadata(coreOptions, cls);

  if (!id && document && metadata.primary) {
    id = getId(coreOptions, cls, document);
  }

  return { cls, document, id: id || '', index: metadata.index, type: metadata.type };
}

/**
 * Returns the content to send to a bulk query
 * @param coreOptions Core options
 * @param action Bulk action type
 * @param cls Indexed class the documents belong to
 * @param documents Array of document to send
 */
export function buildBulkQuery<T>(coreOptions: ICoreOptions, action: 'index', cls: IndexedClass<T>, documents: Array<Partial<T>>): any {
  const metadata = getIndexMetadata(coreOptions, cls);
  const body: any[] = [];

  documents.forEach((document: Partial<T>) => {
    const description: any = { _index: metadata.index, _type: metadata.type };
    if (metadata.primary && (document as any)[metadata.primary]) {
      description._id = (document as any)[metadata.primary];
    }
    body.push({ [action]: description }, document);
  });

  return { body };
}
