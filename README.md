# Minimal Event Bus

[![npm version](https://img.shields.io/npm/v/minimal-event-bus.svg)](https://www.npmjs.com/package/minimal-event-bus) [![npm downloads](http://img.shields.io/npm/dm/minimal-event-bus.svg)](https://npmcharts.com/compare/minimal-event-bus?start=1200&interval=30)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A ultra-lightweight, type-safe event bus for TypeScript/JavaScript with zero runtime validation - relying purely on TypeScript's compile-time type checking for safety and performance.

## Features

- **🔥 Minimal**: Extremely small footprint with no runtime overhead
- **⏱️ Fast**: No runtime argument validation - trusts TypeScript's type system
- **🔒 Type Safe**: Full TypeScript support with compile-time type checking
- **🎯 Zero Dependencies**: No external dependencies
- **📦 Tree Shakeable**: ES modules with clean exports
- **🔧 Flexible**: Supports limited listeners, function extraction, and more

## Installation

```bash
npm install minimal-event-bus
# or
pnpm add minimal-event-bus
```

## Quick Start

```typescript
import { EventBus } from 'minimal-event-bus';

// Define your event types
// Warning! Here you must use type, not interface. or you will get an error(about "Cannot use xxx as an index").
// If you add [K: string]: xxx, then there will be no auto-complete for event names when you calls `emit`/`on`.
type Events = {
  userLogin: (userId: string, timestamp: Date) => void;
  userLogout: (userId: string) => void;
  dataUpdate: (data: any[]) => void;
};

// Create event bus
const bus = new EventBus<Events>();

// Register listeners
bus.on('userLogin', (userId, timestamp) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

// Emit events
bus.emit('userLogin', 'user123', new Date());
```

## API Reference

### `EventBus<T>`

#### `new EventBus<T>()`

Create a new event bus instance with typed events.

#### `on<K>(event: K, listener: T[K], limit?: number): number`

Register a listener for the given event.

- `event`: Event name
- `listener`: Event handler function
- `limit`: (optional) Maximum number of times the listener can be called
- Returns: Index of the listener in the internal array

```typescript
const index = eventBus.on('userLogin', (userId) => {
  console.log('User logged in:', userId);
});

// Limited listener - only called 3 times
eventBus.on(
  'dataUpdate',
  (data) => {
    console.log('Data updated:', data);
  },
  3
);
```

#### `off<K>(event: K, listener?: T[K]): boolean`

Remove a listener for the given event.

- `event`: Event name
- `listener`: (optional) Specific handler to remove. If omitted, removes all listeners for the event
- Returns: `true` if successfully removed, `false` otherwise

```typescript
const handler = (userId: string) => console.log(userId);
eventBus.on('userLogin', handler);
eventBus.off('userLogin', handler); // Remove specific listener
eventBus.off('userLogin'); // Remove all listeners for event
```

#### `emit<K>(event: K, ...args: Parameters<T[K]>): ReturnType<T[K]>[]`

Trigger all listeners for the given event.

- `event`: Event name
- `args`: Arguments to pass to the listeners
- Returns: Array of return values from each listener

```typescript
const results = eventBus.emit('userLogin', 'user123', new Date());
```

#### `getEmitFn(): typeof this.emit`

Get a wrapped `emit` function that can be used independently.

```typescript
const emit = eventBus.getEmitFn();
emit('userLogin', 'user123', new Date());
```

#### `getOnFn(): typeof this.on`

Get a wrapped `on` function that can be used independently.

#### `getOffFn(): typeof this.off`

Get a wrapped `off` function that can be used independently.

### Static Methods

#### `EventBus.create<T>()`

Create an event bus with extracted functions for convenience.

```typescript
const { bus, emit, on, off } = EventBus.create<Events>();

on('userLogin', (userId) => console.log(userId));
emit('userLogin', 'user123');
```

## Performance Philosophy

This library prioritizes performance and minimal footprint over runtime safety. It **trusts TypeScript's type system completely** and performs **no runtime argument validation**. This design choice results in:

- **Zero runtime overhead** from type checking
- **Minimal bundle size**
- **Maximum performance**

If you need runtime validation, consider other event bus libraries. This library is perfect when you want type safety without runtime costs.

## Advanced Usage

### Limited Listeners

```typescript
// This listener will only be called 5 times
eventBus.on(
  'apiCall',
  (response) => {
    console.log('API response:', response);
  },
  5
);
```

### Multiple Listeners

```typescript
// Same function can be registered multiple times
const handler = () => console.log('Called');
eventBus.on('test', handler);
eventBus.on('test', handler); // Will be called twice on emit
```

### Return Values

```typescript
interface Events {
  calculate: (a: number, b: number) => number;
}

const eventBus = new EventBus<Events>();

eventBus.on('calculate', (a, b) => a + b);
eventBus.on('calculate', (a, b) => a * b);

const results = eventBus.emit('calculate', 5, 3);
console.log(results); // [8, 15]
```

## TypeScript Support

Full TypeScript support with strict type checking:

```typescript
type Events = {
  stringEvent: (message: string) => void;
  numberEvent: (count: number) => string;
};

const eventBus = new EventBus<Events>();

// ✅ Type safe
eventBus.on('stringEvent', (message) => console.log(message));
eventBus.emit('stringEvent', 'Hello World');

// ❌ TypeScript error - wrong argument type
eventBus.emit('stringEvent', 123);

// ❌ TypeScript error - wrong event name
eventBus.emit('wrongEvent', 'test');
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For more awesome packages, check out [my homepage💛](https://baendlorel.github.io/?repoType=npm)
