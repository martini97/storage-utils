import faker from 'faker';
import MockDate from 'mockdate';

import * as event from '../src/event';
import {storage} from '../src/storage';

describe('storage', () => {
  const data = {
    foo: true,
    bar: 'baz',
    ham: {
      complex: true,
      fields: [
        {a: 1, b: 2},
        {c: 3, d: 4},
      ],
    },
    isNull: null,
    isUndefined: undefined,
  };

  describe('get', () => {
    beforeEach(() => {
      Object.entries(data).forEach(([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      });
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    Object.entries(data).forEach(([key, value]) => {
      it(`${key} => ${JSON.stringify(value)}`, () => {
        expect(storage.get(key)).toStrictEqual(value);
      });
    });
  });

  describe('set', () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    Object.entries(data).forEach(([key, value]) => {
      it(`${key}, ${JSON.stringify(value)}`, () => {
        storage.set(key, value);
        expect(window.localStorage.getItem(key)).toBe(value === undefined ? 'undefined' : JSON.stringify(value));
      });
    });
  });

  describe('set <=> get', () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    Object.entries(data).forEach(([key, value]) => {
      it(`${key}, ${JSON.stringify(value)}`, () => {
        storage.set(key, value);
        expect(storage.get(key)).toStrictEqual(value);
      });
    });
  });

  describe('getWithTTL', () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    it('removes item with no expiry date', () => {
      localStorage.setItem('no_ttl', '{"value": {"foo": "bar"}}');

      expect(storage.getWithTTL('no_ttl')).toBeNull();
      expect(localStorage.getItem('no_ttl')).toBeNull();
    });

    it('returns only value', () => {
      const payload = {
        value: {foo: 'bar'},
        expiry: faker.date.future().getTime(),
      };

      localStorage.setItem('with_ttl', JSON.stringify(payload));

      expect(storage.getWithTTL('with_ttl')).toStrictEqual(payload.value);
    });

    it('does not crash if key does not exist', () => {
      localStorage.removeItem('does_not_exist');

      expect(storage.getWithTTL('does_not_exist')).toBeNull();
    });
  });

  describe('setWithTTL', () => {
    beforeEach(() => {
      MockDate.set(Date.now());
    });

    afterEach(() => {
      window.localStorage.clear();
      MockDate.reset();
    });

    it('sets item on localstorage with value and expiry', () => {
      const key = faker.random.alphaNumeric();
      const value = JSON.parse(faker.datatype.json());
      const ttl = faker.datatype.number();

      storage.setWithTTL(key, value, ttl);

      const item = JSON.parse(localStorage.getItem(key));
      expect(item.value).toStrictEqual(value);
      expect(item.expiry).toEqual(Date.now() + ttl);
    });
  });

  describe('#publish', () => {
    it('dispatches event when setting value', () => {
      const spy = jest.spyOn(event, 'dispatch');
      const key = faker.random.alphaNumeric();
      const value = JSON.parse(faker.datatype.json());
      storage.set(key, value);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(key, value);
      spy.mockRestore();
    });

    it('dispatches event when setting value with ttl', () => {
      const spy = jest.spyOn(event, 'dispatch');
      const key = faker.random.alphaNumeric();
      const value = JSON.parse(faker.datatype.json());
      storage.setWithTTL(key, value);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(key, value);
      spy.mockRestore();
    });

    it('dispatches event when removing key', () => {
      const spy = jest.spyOn(event, 'dispatch');
      const key = faker.random.alphaNumeric();
      storage.remove(key);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(key, undefined);
      spy.mockRestore();
    });
  });

  describe('remove', () => {
    it('removes item from storage', () => {
      const key = faker.random.alphaNumeric();
      const value = JSON.parse(faker.datatype.json());

      storage.set(key, value);
      expect(storage.get(key)).toStrictEqual(value);

      storage.remove(key);
      expect(storage.get(key)).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('notifies subscriber of new values', () => {
      const key = faker.random.alphaNumeric();
      const value = JSON.parse(faker.datatype.json());
      const callback = jest.fn();
      const unsubscribe = storage.subscribe(key, callback);

      storage.set(key, value);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(value);
      unsubscribe();
    });

    it('removes event listeners on unsubscribe', () => {
      const key = faker.random.alphaNumeric();
      const callback = jest.fn();
      const unsubscribe = storage.subscribe(key, callback);
      const spy = jest.spyOn(window, 'removeEventListener');

      unsubscribe();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, event.eventId, expect.any(Function));
      expect(spy).toHaveBeenNthCalledWith(2, 'storage', expect.any(Function));

      spy.mockRestore();
    });

    it('handles storage event', () => {
      const key = faker.random.alphaNumeric();
      const newValue = faker.datatype.json();
      const callback = jest.fn();
      const unsubscribe = storage.subscribe(key, callback);

      window.dispatchEvent(new StorageEvent('storage', {key, storageArea: localStorage, newValue}));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(JSON.parse(newValue));

      unsubscribe();
    });

    it('handles storage event for ttl', () => {
      const key = faker.random.alphaNumeric();
      const value = {value: JSON.parse(faker.datatype.json()), expiry: faker.date.future().getTime(), __isTTL: true};
      const callback = jest.fn();
      const unsubscribe = storage.subscribe(key, callback);

      window.dispatchEvent(
        new StorageEvent('storage', {key, storageArea: localStorage, newValue: JSON.stringify(value)}),
      );

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(value.value);

      unsubscribe();
    });
  });
});
