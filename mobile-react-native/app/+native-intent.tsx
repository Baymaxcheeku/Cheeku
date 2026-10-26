/*
 * iOS opens the app from the share extension with "<scheme>://dataUrl=<key>".
 * That is not a screen, so Expo Router would show "unmatched route". Send it
 * to Scan; ShareIntake reads the file from the same URL.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes("dataUrl=") ? "/scan?shared=1" : path;
}
