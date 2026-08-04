/* NativeWind consumes global.css through Metro; TypeScript needs to be told
   the side-effect import is legal. */
declare module "*.css";
