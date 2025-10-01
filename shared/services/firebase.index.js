// Platform-specific exports for firebase service
if (typeof window !== 'undefined') {
  // Web environment
  module.exports = require('./firebase.web');
} else {
  // React Native environment
  module.exports = require('./firebase');
}