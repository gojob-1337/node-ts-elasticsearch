import { DECORATORS } from '../constants';

/**
 * Primary decorator factory
 */
export const Primary = () => {
  /**
   * Primary decorator
   * Complete class metadata to set current field as primary key
   */
  return (target: any, key: string) => {
    const meta = Reflect.getMetadata(DECORATORS.INDEX, target.constructor) || {};
    if (meta.primary) {
      throw new Error(`Duplicate primary key for class ${target.constructor.name} (${meta.primary}, ${key})`);
    }
    meta.primary = key;
    Reflect.defineMetadata(DECORATORS.INDEX, meta, target.constructor);
  };
};
