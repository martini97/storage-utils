import * as utils from './utils';
import * as event from './event';

type ItemWithTTL<T> = {
  value: T;
  expiry: number;
  __isTTL: boolean;
};

class Storage {
  #cache: Record<string, unknown> = {};

  get<T>(key: string): T | null {
    try {
      if (this.#cache[key] !== undefined) {
        return this.#cache[key] as T;
      }

      return utils.parseJson<T>(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): boolean {
    let isPersisted = false;
    try {
      localStorage.setItem(key, value === undefined ? 'undefined' : JSON.stringify(value));
      this.#cache[key] = undefined;
      isPersisted = true;
    } catch {
      this.#cache[key] = value;
    } finally {
      this.#publish(key, Storage.#getActualValue(value));
    }

    return isPersisted;
  }

  remove(key: string): void {
    this.#cache[key] = undefined;
    localStorage.removeItem(key);
    this.#publish(key, undefined);
  }

  getWithTTL<T>(key: string): T | null {
    const item: ItemWithTTL<T> | null = this.get(key);
    if (item === null) {
      return null;
    }

    const now = new Date().getTime();
    if (!item.expiry || now > item.expiry) {
      this.remove(key);
      return null;
    }

    return item.value;
  }

  setWithTTL(key: string, value: unknown, ttlMs = 30 * 60 * 1000): boolean {
    const expiry = new Date().getTime() + ttlMs;
    return this.set(key, {value, expiry, __isTTL: true});
  }

  #publish(key: string, value: unknown): void {
    event.dispatch(key, value);
  }

  static #getActualValue<T>(value: T | ItemWithTTL<T>): T {
    if (!value) {
      return value as T;
    }

    const ttlKeys = ['expiry', 'value', '__isTTL'];
    const valueKeys = Object.keys(value);
    const isTTL = ttlKeys.every((key) => valueKeys.includes(key)) && (value as ItemWithTTL<T>)?.__isTTL === true;
    return isTTL ? (value as ItemWithTTL<T>).value : (value as T);
  }

  subscribe(key: string | string[], callback: (value: unknown) => void): () => void {
    const keys = Array.isArray(key) ? key : [key];
    function onCustom(event: CustomEvent) {
      if (event.detail?.key && keys.includes(event.detail.key)) {
        callback(event.detail?.value);
      }
    }

    function onStorage(event: StorageEvent) {
      if (event.storageArea === localStorage && keys.includes(event.key)) {
        const value = event.newValue ? utils.parseJson(event.newValue) : this.get(event.key);
        callback(Storage.#getActualValue(value));
      }
    }

    window.addEventListener(event.eventId, onCustom);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(event.eventId, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }
}

export const storage = new Storage();
