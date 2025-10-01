// Platform-specific exports for AuthContext
if (typeof window !== 'undefined') {
  // Web environment
  module.exports = require('./AuthContext.web');
} else {
  // React Native environment
  module.exports = require('./AuthContext');
}