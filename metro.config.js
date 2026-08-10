const { getDefaultConfig } = require("expo/metro-config");

//Get Path
const path = require('path');

// Get the default Metro configuration
const config = getDefaultConfig(__dirname);

// Customize the Metro configuration
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((extension) => extension !== 'svg');
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('svg');
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@': path.resolve(__dirname, 'src'),
};
// Add custom middleware to set security headers
config.server.enhanceMiddleware = (middleware) => (request, response, next) => {
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(request, response, next);
};

// Export the customized Metro configuration
module.exports = config;
