// Mock manual para ConnectivityService usado nos testes
const listeners = [];

module.exports = {
  initialize: jest.fn().mockResolvedValue(undefined),
  addConnectivityListener: jest.fn((cb) => {
    listeners.push(cb);
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }),
  getCurrentState: jest.fn(() => ({ isConnected: false })),
  isConnected: jest.fn(() => false),
  cleanup: jest.fn(() => {})
};
