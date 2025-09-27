type AnyFn = (...args: any[]) => any;

/**
 * ## Usage
 * This package trusts you and **will not validate arguments**, it is for minimalizing and performance.
 *
 * It is recommended to define your event types and get full type hint!
 *
 * __PKG_INFO__
 */
export class EventBus<T extends Record<string, AnyFn>> {
  /**
   * Create an EventBus instance and return its methods bound to it.
   * - Binding is done using wrapper functions to avoid performance loss from `Function.prototype.bind`.
   */
  public static create<T extends Record<string, AnyFn>>() {
    const bus = new EventBus<T>();
    return {
      bus,
      on: ((...args) => bus.on.apply(bus, args)) as typeof bus.on,
      off: ((...args) => bus.off.apply(bus, args)) as typeof bus.off,
      emit: ((...args) => bus.emit.apply(bus, args)) as typeof bus.emit,
    };
  }

  /**
   * Using `Map` because:
   * 1. under 1e6 keys, `Map` has the almost same memory usage as `Object.create(null)`
   *    - under 1000, `Map` is 2 times less
   * 2. `Map` is much faster(about 4~5 times).
   *    - both 1e6 key-value pairs, iterate 1e6 times,null object takes 200ms at average while `Map` takes only 40ms.
   *    - both 10 key-value pairs, iterate 1e6 times,null object takes 40ms at average while `Map` takes only 12ms.
   * @internal
   */
  private readonly _listeners = new Map<keyof T, T[keyof T][]>();

  /**
   * For listeners with calling limit. Make them able to call `off` with the original function reference.
   * @internal
   */
  private readonly _limitMap = new Map<T[keyof T], T[keyof T]>();

  /**
   * Save the listeners that have reached their limit and need to be cleaned after `emit`.
   * @internal
   */
  private _cleanList = new Set<AnyFn>();

  /**
   * @internal
   */
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
   * @param limit (optional) falsy values are considered as `Infinity`
   * @returns the index of the listener in the internal array
   * - be aware that the index is not always
   */
  on<K extends keyof T>(event: K, listener: T[K], limit?: number): number {
    const listeners = this._getListeners(event);
    if (!limit) {
      return listeners.push(listener) - 1;
    }

    const origin = listener;
    let count = limit;
    listener = ((...args) => {
      count--;
      if (count <= 0) {
        this._cleanList.add(listener);
      }
      return origin(...args);
    }) as typeof listener;
    this._limitMap.set(origin, listener);
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
}
