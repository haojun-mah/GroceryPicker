const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

<<<<<<< HEAD
module.exports = withNativeWind(config, { input: './global.css' });
=======
module.exports = withNativeWind(config, { input: './global.css' });
>>>>>>> frontend
