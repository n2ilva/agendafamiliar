// In-memory mock of AsyncStorage for Jest
const storage = new Map();

module.exports = {
  getItem: jest.fn((key) => {
    return Promise.resolve(storage.has(key) ? storage.get(key) : null);
  }),
  setItem: jest.fn((key, value) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
  multiGet: jest.fn((keys) => Promise.resolve(keys.map(k => [k, storage.get(k) || null]))),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([k, v]) => storage.set(k, v));
    return Promise.resolve();
  }),
  // helper to prefill mock storage in tests
  __INTERNAL_MOCK_storage: storage
};
