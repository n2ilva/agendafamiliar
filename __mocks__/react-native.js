// Mock mínimo do react-native para testes em Node
module.exports = {
  Platform: { OS: 'ios', select: obj => obj.ios },
  NativeModules: {},
  // mocks para quaisquer outros exports que possam ser usados nos testes
  Dimensions: {
    get: () => ({ width: 375, height: 667 })
  }
};
