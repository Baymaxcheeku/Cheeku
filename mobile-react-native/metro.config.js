const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Founder material and the Remotion demo projects live in this folder but are
// never part of the app; keep Metro from crawling their own node_modules.
config.resolver.blockList = [/\/founder-ops\/.*/, /\/marketing\/.*/];

module.exports = withNativeWind(config, { input: "./global.css" });
