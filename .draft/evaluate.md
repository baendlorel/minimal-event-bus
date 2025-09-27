# EventBus 代码评估 (Updated)

## 改进已完成的地方

### ✅ 修复的问题

1. **限制监听器Bug已修复**
   - 之前的问题：在限制次数用完时返回 `true` 而不是执行原函数
   - 现在的实现：正确先执行原函数，再检查是否需要移除

2. **内存泄漏问题已解决**
   - 增加了 `_cleanList` 来处理限制监听器的清理
   - 在 `off` 方法中正确清理 `_limitMap`

3. **移除了过度设计**
   - 删除了复杂的 `wrap` 函数
   - 简化了 getter 方法的实现

## 仍可精简的地方

### 1. 注释仍然过于详细

```typescript
/**
 * Using `Map` because:
 * 1. under 1e6 keys, `Map` has the almost same memory usage as `Object.create(null)`
 *    - under 1000, `Map` is 2 times less
 * 2. `Map` is much faster(about 4~5 times).
 *    - both 1e6 key-value pairs, iterate 1e6 times,null object takes 200ms at average while `Map` takes only 40ms.
 *    - both 10 key-value pairs, iterate 1e6 times,null object takes 40ms at average while `Map` takes only 12ms.
 */
```

**建议：** 对于"极简"库，这些性能细节可以简化为：

```typescript
// Using Map for better performance and memory efficiency
```

### 2. `_getListeners` 方法仍可简化

```typescript
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
```

**建议简化为：**

```typescript
private _getListeners(event: keyof T): T[keyof T][] {
  let listeners = this._listeners.get(event);
  if (!listeners) {
    listeners = [];
    this._listeners.set(event, listeners);
  }
  return listeners;
}
```

### 3. 默认泛型参数可能不必要

```typescript
export class EventBus<T extends Record<string, AnyFn> = Record<string, AnyFn>>
```

**建议：** 可以简化为 `export class EventBus<T extends Record<string, AnyFn>>`

## 仍存在的问题

### 1. 清理逻辑的性能问题

```typescript
this._listeners.set(
  event,
  listeners.filter((fn) => !this._cleanList.has(fn))
);
```

**问题：** 每次 `emit` 都会创建新数组，即使没有需要清理的监听器
**建议：** 只在确实需要清理时才执行过滤操作

### 2. 类型安全问题

```typescript
const origin = this._limitMap.get(listener);
if (origin) {
  listener = origin as T[K];
}
```

**问题：** 类型断言可能不安全
**建议：** 使用更安全的类型检查

### 3. 注释不完整

```typescript
/**
 * @returns the index of the listener in the internal array
 * - be aware that the index is not always
 */
```

**问题：** 注释被截断，"is not always" 后面应该说什么

### 4. 错误处理仍然不足

**问题：** 没有处理监听器函数执行时抛出异常的情况
**影响：** 一个监听器出错会阻止后续监听器执行和结果返回

## 新的改进建议

### 1. 优化清理逻辑

```typescript
emit<K extends keyof T, R = ReturnType<T[K]>>(event: K, ...args: Parameters<T[K]>): R[] {
  const listeners = this._listeners.get(event);
  if (!listeners || listeners.length === 0) {
    return [];
  }

  const result = listeners.map((fn) => fn(...args));

  // 只在有需要清理的监听器时才执行过滤
  if (this._cleanList.size > 0) {
    const hasCleanable = listeners.some(fn => this._cleanList.has(fn));
    if (hasCleanable) {
      this._listeners.set(
        event,
        listeners.filter((fn) => !this._cleanList.has(fn))
      );
    }
    this._cleanList.clear();
  }

  return result;
}
```

### 2. 改进类型安全

```typescript
off<K extends keyof T>(event: K, listener?: T[K]): boolean {
  if (!listener) {
    return this._listeners.delete(event);
  }
  const listeners = this._listeners.get(event);
  if (!listeners) {
    return false;
  }

  // 更安全的类型处理
  const actualListener = this._limitMap.get(listener) ?? listener;

  const index = listeners.indexOf(actualListener);
  if (index !== -1) {
    listeners.splice(index, 1);
    // 清理 limitMap
    if (this._limitMap.has(listener)) {
      this._limitMap.delete(listener);
    }
    return true;
  }

  return false;
}
```

## 总体评价

### 改进程度：⭐⭐⭐⭐☆

- ✅ 主要Bug已修复
- ✅ 内存泄漏已解决
- ✅ 过度设计已简化
- ⚠️ 仍有性能和类型安全改进空间
- ⚠️ 错误处理仍需考虑

### 建议优先级

1. **高优先级：** 完善注释，修复截断的文档
2. **中优先级：** 优化清理逻辑性能，改进类型安全
3. **低优先级：** 简化过详细的注释

当前的实现已经很好地平衡了功能性和简洁性，主要问题都已解决。
