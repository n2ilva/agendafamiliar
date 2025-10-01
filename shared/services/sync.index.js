// Platform-specific exports for sync service
if (typeof window !== 'undefined') {
  // Web environment
  module.exports = require('./sync.web');
} else {
  // React Native environment
  module.exports = require('./sync');
}