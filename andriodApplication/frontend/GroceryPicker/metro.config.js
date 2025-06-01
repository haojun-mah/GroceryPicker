const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow React library to use node js modules
config.resolver.extraNodeModules = {
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util'),
  buffer: require.resolve('browserify-buffer'),
  url: require.resolve('react-native-url-polyfill'),
  path: require.resolve('path-browserify'),
  crypto: require.resolve('crypto-browserify'),
  assert: require.resolve('assert'),
  process: require.resolve('process/browser'),
  vm: require.resolve('vm-browserify'),
  https: require.resolve('https-browserify'),
  http: require.resolve('stream-http'),
  net: require.resolve('stream-browserify'), 
  tls: require.resolve('stream-browserify'),
  zlib: require.resolve('browserify-zlib')
};

config.resolver.resolverMainFields = ['browser', 'main', 'module'];

module.exports = withNativeWind(config, { input: './global.css' });
