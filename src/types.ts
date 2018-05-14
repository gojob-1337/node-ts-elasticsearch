/**
 * Define a type by removing some keys or another one
 *
 * typescript 2.8
 *
 * Usage:
 *
 * type DestType = Omit<SourceType, 'key1' |'key2'>
 */

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type Indexed<T> = Omit<T, 'index' | 'type'>;

export type IndexedClass<T> = new (...args: any[]) => T;

export type AnyClass = new (...args: any[]) => any;
