import { DECORATORS } from '../constants';
import { IndexedClass } from '../types';

export type StringType = 'text' | 'keyword';
export type NumericType = 'long' | 'integer' | 'short' | 'byte' | 'double' | 'float' | 'half_float' | 'scaled_float';
export type DateType = 'date';
export type BooleanType = 'boolean';
export type BinaryType = 'binary';
export type RangeType = 'integer_range' | 'float_range' | 'long_range' | 'double_range' | 'date_range';
export type GeoType = 'geo_point' | 'geo_shape';
export type SpecialisedType = 'ip' | 'completion' | 'token_count' | 'murmur3';

export type FieldType = StringType | NumericType | DateType | BooleanType | BinaryType | RangeType | GeoType | SpecialisedType;

export interface IDisabledFieldOptions {
  enabled: false;
}

export interface IFieldOptions {
  type: FieldType;
  index?: boolean;
  boost?: number;
  coerce?: boolean;
  copy_to?: string;
  doc_values?: boolean;
  dynamic?: true | false | 'strict';
  enabled?: true;
  ignore_malformed?: boolean;
  index_options?: 'docs' | 'freqs' | 'positions' | 'offsets';
  norms?: boolean;
  null_value?: any;
  similarity?: string;
  store?: boolean;
}
export interface IStringFieldOptions extends IFieldOptions {
  type: StringType;
  analyzer?: string;
  search_analyzer?: string;
  normalizer?: string;
  fielddata?: boolean;
  fielddata_frequency_filter?: any;
  eager_global_ordinals?: boolean;
  ignore_above?: number;
  position_increment_gap?: number;
  term_vector?: 'no' | 'yes' | 'with_positions' | 'with_offsets' | 'with_positions_offsets';
  fields?: {
    [name: string]: IStringFieldOptions;
  };
}

export interface IDateFieldOptions extends IFieldOptions {
  type: 'date';
  format?: string;
}

export interface IObjectOptions {
  object: IndexedClass<any>;
}

export interface INestedOptions {
  nested: IndexedClass<any>;
}

/**
 * Elasticsearch available options
 */
export interface IESFieldOptions {
  type?: string;
  index?: boolean;
  boost?: number;
  coerce?: boolean;
  copy_to?: string;
  doc_values?: boolean;
  dynamic?: true | false | 'strict';
  enabled?: boolean;
  ignore_malformed?: boolean;
  index_options?: string;
  norms?: boolean;
  null_value?: any;
  similarity?: string;
  store?: boolean;
  format?: string;
  analyzer?: string;
  search_analyzer?: string;
  normalizer?: string;
  fielddata?: boolean;
  fielddata_frequency_filter?: any;
  eager_global_ordinals?: boolean;
  ignore_above?: number;
  position_increment_gap?: number;
  term_vector?: string;
  fields?: {
    [name: string]: IStringFieldOptions;
  };
  properties?: IPropertiesMetadata;
}

export interface IFieldStructure extends IESFieldOptions {
  _cls?: IndexedClass<any>;
}

export interface IPropertiesMetadata {
  [name: string]: IFieldStructure;
}

/**
 * Field decorator factory
 * @param typeOrOptions
 */
export const Field = (
  typeOrOptions:
    | FieldType
    | IDisabledFieldOptions
    | IFieldOptions
    | IStringFieldOptions
    | IDateFieldOptions
    | IObjectOptions
    | INestedOptions
    | IStringFieldOptions,
) => {
  let options: IFieldStructure = typeof typeOrOptions === 'string' ? { type: typeOrOptions } : {};

  if (typeof typeOrOptions === 'object') {
    if ((typeOrOptions as IObjectOptions).object) {
      options.type = 'object';
      options._cls = (typeOrOptions as IObjectOptions).object;
    } else if ((typeOrOptions as INestedOptions).nested) {
      options.type = 'nested';
      options._cls = (typeOrOptions as INestedOptions).nested;
    } else {
      // es definition
      options = { ...typeOrOptions } as IFieldStructure;
    }
    if (options._cls) {
      options.properties = Reflect.getMetadata(DECORATORS.PROPERTIES, options._cls);
    }
  }

  /**
   * Field decorator
   * Store field description into class metadata using DECORATORS.FIELDS key
   */
  return (target: any, key: string) => {
    const properties: IPropertiesMetadata = Reflect.getMetadata(DECORATORS.PROPERTIES, target.constructor) || {};
    if (properties[key]) {
      throw new Error(`Multiple usage of @Field() on ${target.constructor.name}.${key}`);
    }
    properties[key] = options;
    Reflect.defineMetadata(DECORATORS.PROPERTIES, properties, target.constructor);
  };
};
