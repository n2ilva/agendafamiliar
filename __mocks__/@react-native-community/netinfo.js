// Mock simples do pacote netinfo
module.exports = {
  addEventListener: jest.fn(() => ({ remove: () => {} })),
  fetch: jest.fn(async () => ({ isConnected: true })),
};
