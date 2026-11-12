/*
 * The wearables layer's public face. Route files in `app/wearables/` import
 * the screens from here; nothing else in the app imports this folder except
 * the register line in `app/_layout.tsx`. See README.md.
 */
export { WearablesConnectScreen } from "./ui/connect-screen";
export { WearablesHubScreen } from "./ui/hub-screen";
export { WearablesMetricScreen } from "./ui/metric-screen";
