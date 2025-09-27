import { expect, describe, it, vi } from 'vitest';
import { EventBus } from '../src/index.js';

interface TestEvents extends Record<string, (...args: any[]) => any> {
  simpleEvent: () => void;
  stringEvent: (message: string) => void;
  multiParamEvent: (a: number, b: string, c: boolean) => void;
  returnValueEvent: (x: number) => number;
  multiReturnEvent: (x: number, y: number) => number;
  mixedReturnEvent: (x: number, y: number) => any;
}

describe('EventBus', () => {
  describe('Basic functionality', () => {
    it('should create an event bus instance', () => {
      const eventBus = new EventBus<TestEvents>();
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('should register and emit simple event', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn);
      eventBus.emit('simpleEvent');

      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should pass arguments to listeners correctly', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('stringEvent', mockFn);
      eventBus.emit('stringEvent', 'test message');

      expect(mockFn).toHaveBeenCalledWith('test message');
    });

    it('should handle multiple parameters correctly', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('multiParamEvent', mockFn);
      eventBus.emit('multiParamEvent', 42, 'hello', true);

      expect(mockFn).toHaveBeenCalledWith(42, 'hello', true);
    });

    it('should return empty array when no listeners', () => {
      const eventBus = new EventBus<TestEvents>();
      const result = eventBus.emit('simpleEvent');

      expect(result).toEqual([]);
    });
  });

  describe('on() method', () => {
    it('should return listener index', () => {
      const eventBus = new EventBus<TestEvents>();

      const index1 = eventBus.on('simpleEvent', () => {});
      const index2 = eventBus.on('simpleEvent', () => {});

      expect(index1).toBe(0);
      expect(index2).toBe(1);
    });

    it('should allow same function to be registered multiple times', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn);
      eventBus.on('simpleEvent', mockFn);
      eventBus.emit('simpleEvent');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should support limited listeners', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn, 2);

      // First call
      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Second call
      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Third call - should not be called
      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle limited listener with limit 1', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn, 1);

      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(1);

      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle limited listener with limit 0 or other falsy values', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn, 0);
      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledTimes(1);

      const mockFn2 = vi.fn();
      eventBus.on('simpleEvent', mockFn2, null as any);
      eventBus.emit('simpleEvent');
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('off() method', () => {
    it('should remove specific listener', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();

      eventBus.on('simpleEvent', mockFn1);
      eventBus.on('simpleEvent', mockFn2);

      const result = eventBus.off('simpleEvent', mockFn1);

      expect(result).toBe(true);

      eventBus.emit('simpleEvent');
      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalledOnce();
    });

    it('should return false when removing non-existent listener', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      const result = eventBus.off('simpleEvent', mockFn);

      expect(result).toBe(false);
    });

    it('should return false when removing from non-existent event', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      const result = eventBus.off('stringEvent', mockFn);

      expect(result).toBe(false);
    });

    it('should remove only first occurrence of duplicate listeners', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn = vi.fn();

      eventBus.on('simpleEvent', mockFn);
      eventBus.on('simpleEvent', mockFn);

      const result = eventBus.off('simpleEvent', mockFn);

      expect(result).toBe(true);

      eventBus.emit('simpleEvent');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should remove all listeners when no function provided', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();

      eventBus.on('simpleEvent', mockFn1);
      eventBus.on('simpleEvent', mockFn2);

      const result = eventBus.off('simpleEvent');

      expect(result).toBe(true);

      eventBus.emit('simpleEvent');
      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).not.toHaveBeenCalled();
    });

    it('should return false when removing all listeners from non-existent event', () => {
      const eventBus = new EventBus<TestEvents>();

      const result = eventBus.off('simpleEvent');

      expect(result).toBe(false);
    });

    it('should handle removal of limited listeners by original function reference', () => {
      const eventBus = new EventBus<TestEvents>();
      const originalFn = vi.fn();

      eventBus.on('simpleEvent', originalFn, 3);

      const result = eventBus.off('simpleEvent', originalFn);

      expect(result).toBe(true);

      eventBus.emit('simpleEvent');
      expect(originalFn).not.toHaveBeenCalled();
    });
  });

  describe('emit() method', () => {
    it('should return array of return values', () => {
      const eventBus = new EventBus<TestEvents>();

      eventBus.on('returnValueEvent', (x: number) => x * 2);
      eventBus.on('returnValueEvent', (x: number) => x + 1);
      eventBus.on('returnValueEvent', (x: number) => x * x);

      const results = eventBus.emit('returnValueEvent', 5);

      expect(results).toEqual([10, 6, 25]);
    });

    it('should handle listeners with no return value', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn(() => 'test');

      eventBus.on('stringEvent', mockFn1);
      eventBus.on('stringEvent', mockFn2);

      const results = eventBus.emit('stringEvent', 'hello');

      expect(results).toEqual([undefined, 'test']);
    });

    it('should call listeners in registration order', () => {
      const eventBus = new EventBus<TestEvents>();
      const callOrder: number[] = [];

      eventBus.on('simpleEvent', () => callOrder.push(1));
      eventBus.on('simpleEvent', () => callOrder.push(2));
      eventBus.on('simpleEvent', () => callOrder.push(3));

      eventBus.emit('simpleEvent');

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });

  describe('EventBus.create() static method', () => {
    it('should return bus, emit, and on functions', () => {
      const { bus, emit, on } = EventBus.create<TestEvents>();

      expect(bus).toBeInstanceOf(EventBus);
      expect(typeof emit).toBe('function');
      expect(typeof on).toBe('function');
    });

    it('should create working extracted functions', () => {
      const { emit, on } = EventBus.create<TestEvents>();
      const mockFn = vi.fn();

      on('stringEvent', mockFn);
      const result = emit('stringEvent', 'test');

      expect(mockFn).toHaveBeenCalledWith('test');
      expect(result).toEqual([undefined]);
    });
  });

  describe('Edge cases and complex scenarios', () => {
    it('should handle multiple events independently', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();

      eventBus.on('simpleEvent', mockFn1);
      eventBus.on('stringEvent', mockFn2);

      eventBus.emit('simpleEvent');
      expect(mockFn1).toHaveBeenCalledOnce();
      expect(mockFn2).not.toHaveBeenCalled();

      eventBus.emit('stringEvent', 'test');
      expect(mockFn1).toHaveBeenCalledOnce();
      expect(mockFn2).toHaveBeenCalledWith('test');
    });

    it('should handle listener removal during emission', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();

      eventBus.on('simpleEvent', () => {
        mockFn1();
        eventBus.off('simpleEvent', mockFn2);
      });
      eventBus.on('simpleEvent', mockFn2);

      eventBus.emit('simpleEvent');

      expect(mockFn1).toHaveBeenCalledOnce();
      expect(mockFn2).toHaveBeenCalledTimes(0); // because the off listener executes ahead of mockFn2
    });

    it('should handle large number of listeners', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFns = Array.from({ length: 1000 }, () => vi.fn());

      mockFns.forEach((fn) => eventBus.on('simpleEvent', fn));
      eventBus.emit('simpleEvent');

      mockFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce());
    });

    it('should handle listener that throws error', () => {
      const eventBus = new EventBus<TestEvents>();
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalFn = vi.fn();

      eventBus.on('simpleEvent', errorFn);
      eventBus.on('simpleEvent', normalFn);

      expect(() => eventBus.emit('simpleEvent')).toThrow('Test error');
      expect(errorFn).toHaveBeenCalledOnce();
      expect(normalFn).not.toHaveBeenCalled();
    });

    it('should handle complex return value scenarios', () => {
      const eventBus = new EventBus<TestEvents>();

      eventBus.on('mixedReturnEvent', (x: number, y: number) => x + y);
      eventBus.on('mixedReturnEvent', (x: number, y: number) => x - y);
      eventBus.on('mixedReturnEvent', (x: number, y: number) => x * y);
      eventBus.on('mixedReturnEvent', () => {
        /* no explicit return, returns undefined */
      });

      const results = eventBus.emit('mixedReturnEvent', 10, 3);

      expect(results).toEqual([13, 7, 30, undefined]);
    });

    it('should maintain listener index correctness after removals', () => {
      const eventBus = new EventBus<TestEvents>();
      const mockFns = [vi.fn(), vi.fn(), vi.fn()];

      mockFns.forEach((fn) => eventBus.on('simpleEvent', fn));

      // Remove middle listener
      eventBus.off('simpleEvent', mockFns[1]);

      const results = eventBus.emit('simpleEvent');

      expect(results).toHaveLength(2);
      expect(mockFns[0]).toHaveBeenCalledOnce();
      expect(mockFns[1]).not.toHaveBeenCalled();
      expect(mockFns[2]).toHaveBeenCalledOnce();
    });
  });
});
