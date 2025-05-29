const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow React library to use node js modules
config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util'),
  buffer: require.resolve('browserify-buffer'),
  crypto: require.resolve('react-native-crypto'),
  net: require.resolve('react-native-tcp'), 
  tls: require.resolve('react-native-tcp'), 
  url: require.resolve('react-native-url-polyfill'), 
  path: require.resolve('path-browserify'), 
  http: require.resolve('stream-http'), 
  https: require.resolve('https-browserify'), 
  zlib: require.resolve('browserify-zlib'), 
};

// Add the 'browser' field to the mainFields to help resolution
// For packages that provide different code for browser vs Node environments
config.resolver.resolverMainFields = ['browser', 'main', 'module'];

module.exports = config;