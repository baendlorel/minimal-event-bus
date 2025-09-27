type AnyFn = (...args: any[]) => any;

/**
 * ## Usage
 * **This package trusts you and won't do any argument check**, it is for minimizing and performance.
 *
 * ##
 * __PKG_INFO__
 */
export class EventBus<T extends Record<string, AnyFn> = Record<string, AnyFn>> {
  public static create<T extends Record<string, AnyFn>>() {
    const bus = new EventBus<T>();
    return {
      bus,
      on: bus.getOnFn(),
      off: bus.getOffFn(),
      emit: bus.getEmitFn(),
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

  private _cleanList = new Set<AnyFn>();

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
   * @param limit (optional) an integer, indicates the number of calls of this listener.(falsy values are considered as `Infinity`)
   * @returns the index of the listener in the internal array
   * - be aware that the index is not always
   */
  on<K extends keyof T>(event: K, listener: T[K], limit?: number): number {
    const listeners = this._getListeners(event);
    if (limit) {
      const origin = listener;
      let count = limit;
      listener = ((...args) => {
        count--;
        const result = origin(...args);
        if (count <= 0) {
          // & cannot use `listeners.splice` here, because the index might
          // have changed, and the array might have been changed by
          // `filter` calls while cleaning.
          this._cleanList.add(listener);
        }
        return result;
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
  off<K extends keyof T>(event: K, listener?: T[K]): boolean {
    if (!listener) {
      return this._listeners.delete(event);
    }
    const listeners = this._listeners.get(event);
    if (!listeners) {
      return false;
    }

    const origin = this._limitMap.get(listener);
    if (origin) {
      listener = origin as T[K];
      this._limitMap.delete(origin);
    }

    const index = listeners.indexOf(listener);
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

    const result = listeners.map((fn) => fn(...args));

    if (this._cleanList.size === 0) {
      return result;
    }

    // clean the listeners that have reached their limit after execution
    this._listeners.set(
      event,
      listeners.filter((fn) => !this._cleanList.has(fn))
    );

    this._cleanList.clear();
    return result;
  }

  /**
   * Gets an `emit` function that can be used directly.
   */
  getEmitFn(): typeof this.emit {
    return ((...args) => this.emit.apply(this, args)) as typeof this.emit;
  }

  /**
   * Gets an `on` function that can be used directly.
   */
  getOnFn(): typeof this.on {
    return ((...args) => this.on.apply(this, args)) as typeof this.on;
  }

  /**
   * Gets an `off` function that can be used directly.
   */
  getOffFn(): typeof this.off {
    return ((...args) => this.off.apply(this, args)) as typeof this.off;
  }
}
