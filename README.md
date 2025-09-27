# Minimal Event Bus

[![npm version](https://img.shields.io/npm/v/minimal-event-bus.svg)](https://www.npmjs.com/package/minimal-event-bus) [![npm downloads](http://img.shields.io/npm/dm/minimal-event-bus.svg)](https://npmcharts.com/compare/minimal-event-bus?start=1200&interval=30)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A ultra-lightweight, type-safe event bus for TypeScript/JavaScript with zero runtime validation - relying purely on TypeScript's compile-time type checking for safety and performance.

For more awesome packages, check out [my homepage💛](https://baendlorel.github.io/?repoType=npm)

## Features

- **🔥 Minimal**: Extremely small footprint with no runtime overhead
- **⏱️ Fast**: No runtime argument validation - trusts that you will use xxlint or TypeScript's type system to check.
- **🔒 Type Safe**: Full TypeScript support with compile-time type checking
- **🎯 Zero Dependencies**: No external dependencies
- **📦 Tree Shakeable**: ES modules with clean exports
- **🔧 Flexible**: Supports limited listeners, function extraction

## Installation

```bash
npm install minimal-event-bus
# or
pnpm add minimal-event-bus
```

## Quick Start

```typescript
import { EventBus } from 'minimal-event-bus';

type Events = {
  userLogin: (userId: string, timestamp: Date) => void;
  userLogout: (userId: string) => void;
  dataUpdate: (data: any[]) => void;
};

// Create event bus
const bus = new EventBus<Events>();
// or
const { bus, on, off, emit } = EventBus.create<Events>();

// Register listeners
bus.on('user-login', (userId, timestamp) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

// Emit events
bus.emit('user-login', 'user123', new Date());
```

## API Reference

### `EventBus<T>`

Create a type-safe event bus where `T` defines your event signatures.

> Here you may use `type` instead of `interface`, or you will get an error(about "Cannot use xxx as an index").

```typescript
type MyEvents = {
  'user-login': (userId: string, timestamp: Date) => void;
  update: (data: any[]) => number;
};

const bus = new EventBus<MyEvents>();

// Then you type
bus.emit('' <- Here VS Code will pop the list of 'user-login' and 'update', ...)
```

### `EventBus.create<T>(): { bus: EventBus<T>, on: Function, off: Function, emit: Function }`

Factory method that creates an event bus and returns both the instance and standalone functions.

```typescript
const { bus, on, off, emit } = EventBus.create<MyEvents>();

// Use standalone functions
on('userLogin', (userId) => console.log(userId));
emit('userLogin', 'user123', new Date());

// Or use the bus instance
bus.on('dataUpdate', () => {});
```

This is convenient when you primarily want to use the functions directly rather than the instance methods.

### `on<K>(event: K, listener: T[K], limit?: number): number`

Register a listener for the given event.

**Parameters:**

- `event` - Event name (must be a key of `T`)
- `listener` - Event handler function matching the signature defined in `T`
- `limit` _(optional)_ - Maximum number of times this listener can be called. Falsy values are treated as unlimited.

**Returns:** The index of the listener in the internal array.

**Note:**

- One function can be registered multiple times and will be called multiple times
- Limited listeners are automatically removed after reaching their call limit
- The returned index may change when other listeners are removed

### `off<K>(event: K, listener?: T[K]): boolean`

Remove a listener for the given event.

**Parameters:**

- `event` - Event name
- `listener` _(optional)_ - Specific listener to remove. If omitted, removes all listeners for the event

**Returns:** `true` if successfully removed, `false` if not found or event doesn't exist.

**Note:**

- If a listener is registered multiple times, only the first occurrence is removed
- For limited listeners, use the original function reference (not the wrapped one)

### `emit<K>(event: K, ...args: Parameters<T[K]>): ReturnType<T[K]>[]`

Trigger all listeners for the given event.

**Parameters:**

- `event` - Event name
- `...args` - Arguments to pass to all listeners (must match the signature defined in `T`)

**Returns:** Array of return values from each listener in registration order.

**Note:**

- Returns empty array if no listeners are registered
- Limited listeners that reach their limit are cleaned up after execution
- If a listener throws an error, subsequent listeners won't be called

## License

MIT
