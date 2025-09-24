const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configurar porta padrão
config.server = {
  port: 8081,
};

module.exports = config;