import {EventEmitter} from 'events';
import type {FirestorePermissionError} from './errors';

type Events = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// This is a workaround for the fact that you can't properly type
// an event emitter with a generic.
interface TypedEventEmitter extends EventEmitter {
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean;
  on<K extends keyof Events>(event: K, listener: Events[K]): this;
  off<K extends keyof Events>(event: K, listener: Events[K]): this;
  once<K extends keyof Events>(event: K, listener: Events[K]): this;
}

export const errorEmitter: TypedEventEmitter = new EventEmitter();
