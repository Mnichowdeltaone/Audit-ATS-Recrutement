declare global {
  interface PromiseConstructor {
    try?<T>(callback: () => T | PromiseLike<T>): Promise<T>;
  }
}

if (typeof Promise.try !== 'function') {
  Promise.try = function promiseTry<T>(callback: () => T | PromiseLike<T>): Promise<T> {
    return new Promise((resolve) => resolve(callback()));
  };
}

export {};
