// Platform-specific exports for storage service
if (typeof window !== 'undefined') {
  // Web environment
  module.exports = require('./storage.web');
} else {
  // React Native environment
  module.exports = require('./storage');
}