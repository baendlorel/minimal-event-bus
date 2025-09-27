type AnyFn = (...args: any[]) => any;

const $define = Object.defineProperty;

/**
 * ## Usage
 * **This package trusts you and won't do any argument check**, it is for minimizing and performance.
 *
 * ##
 * __PKG_INFO__
 */
export class EventBus<T extends Record<string, AnyFn>> {
  public static create<T extends Record<string, AnyFn>>() {
    const bus = new EventBus<T>();
    return {
      bus,
      emit: bus.getEmitFn(),
      on: bus.getOnFn(),
    };
  }

  /**
   * Using `Map` because:
   * 1. under 1e6 keys, `Map` has the almost same memory usage as `Object.create(null)`
   *    - under 1000, `Map` is 2 times less
   * 2. `Map` is much faster(about 4~5 times).
   *    - both 1e6 key-value pairs, iterate 1e6 times,null object takes 200ms at average while `Map` takes only 40ms.
   *    - both 10 key-value pairs, iterate 1e6 times,null object takes 40ms at average while `Map` takes only 12ms.
   */
  private readonly _listeners = new Map<keyof T, T[keyof T][]>();

  /**
   * For listeners with calling limit. Make them able to call `off` with the original function reference.
   */
  private readonly _limitMap = new Map<T[keyof T], T[keyof T]>();

  private _getListeners(event: keyof T): T[keyof T][] {
    const listeners = this._listeners.get(event);
    if (listeners) {
      return listeners;
    } else {
      const temp: T[keyof T][] = [];
      this._listeners.set(event, temp);
      return temp;
    }
  }

  /**
   * Register a listener for the given event
   * - one function can be registered multiple times, and will be called multiple times.
   * @param event event name string
   * @param listener handler
   * @param limit (optional) an integer, indicates the number of calls of this listener.
   * @returns the index of the listener in the internal array
   * - this can be used to locate the return value of `emit`
   * - be aware that the index of the listener will change when you use `off`
   */
  on<K extends keyof T>(event: K, listener: T[K], limit?: number): number {
    const listeners = this._getListeners(event);
    if (limit) {
      const origin = listener;
      let count = limit;
      listener = ((...args) => {
        // & judge first means reaching 0 will not affect the current call but will affect the next call
        if (count <= 0) {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
            return true;
          }
        }
        count--;
        return origin(...args);
      }) as typeof listener;
      this._limitMap.set(origin, listener);
    }
    return listeners.push(listener) - 1;
  }

  /**
   * Remove a listener for the given event
   * - if one listener is registered multiple times, only the first one will be removed.
   * @param event event name string
   * @param listener handler
   * @returns `true` when successfully removed. `false` when not found or otherwise
   */
  off<K extends keyof T>(event: K, fn?: T[K]): boolean {
    if (!fn) {
      return this._listeners.delete(event);
    }
    const listeners = this._listeners.get(event);
    if (!listeners) {
      return false;
    }

    fn = (this._limitMap.get(fn) || fn) as T[K];

    const index = listeners.indexOf(fn);
    if (index !== -1) {
      listeners.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Trigger all listeners for the given event
   * @param event event name string
   * @param args arguments that will pass to the listeners
   * @returns an array of return values of each listener
   */
  emit<K extends keyof T, R = ReturnType<T[K]>>(event: K, ...args: Parameters<T[K]>): R[] {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return [];
    }

    return listeners.map((fn) => fn(...args));
  }

  /**
   * Gets a wrapped `emit` function that can be used directly.
   * - `name` and `length` are preserved.
   */
  getEmitFn(): typeof this.emit {
    const emit: typeof this.emit = (...args) => this.emit(...args);
    $define(emit, 'length', { value: this.emit.length, configurable: true });
    $define(emit, 'name', { value: 'emit', configurable: true });
    return emit;
  }

  /**
   * Gets a wrapped `on` function that can be used directly.
   * - `name` and `length` are preserved.
   */
  getOnFn(): typeof this.on {
    const on: typeof this.on = (...args) => this.on(...args);
    $define(on, 'length', { value: this.on.length, configurable: true });
    $define(on, 'name', { value: 'on', configurable: true });
    return on;
  }

  /**
   * Gets a wrapped `off` function that can be used directly.
   * - `name` and `length` are preserved.
   */
  getOffFn(): typeof this.off {
    const off: typeof this.off = (...args) => this.off(...args);
    $define(off, 'length', { value: this.off.length, configurable: true });
    $define(off, 'name', { value: 'off', configurable: true });
    return off;
  }
}
