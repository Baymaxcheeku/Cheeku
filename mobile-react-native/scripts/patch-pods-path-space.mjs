#!/usr/bin/env node
/*
 * Re-quotes the generated Xcode build scripts so a SPACE in the project path
 * does not break the iOS build.
 *
 * WHY THIS EXISTS. This checkout lives at "/Users/…/Baymax App Dev/…", and two
 * generated script phases interpolate that path without quoting it. Both fail
 * the same way, with an error that names a path which does not exist and never
 * mentions quoting, so it reads like a missing file rather than a parsing bug:
 *
 *   No such file or directory: /Users/atharsmac/Downloads/Baymax
 *
 * WHY IT IS A SCRIPT AND NOT A ONE-OFF EDIT. `pod install` regenerates the Pods
 * project and `expo prebuild` regenerates the app project, so both fixes are
 * erased on every native rebuild. Renaming the folder would fix this
 * permanently and was declined deliberately; this is the supported
 * alternative. `npm run pods` runs it for you. After a prebuild, run:
 *
 *   node scripts/patch-pods-path-space.mjs
 *
 * Exits 0 in every case, including "nothing to patch", so it is safe to chain.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

/** The expo-constants script phase, in the CocoaPods project. */
const PODS = {
  file: "ios/Pods/Pods.xcodeproj/project.pbxproj",
  label: "EXConstants app.config",
  from: 'shellScript = "bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"";',
  to: 'shellScript = "bash -l -c \\"\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\"\\"";',
};

/*
 * The React Native bundling phase, in the app project.
 *
 * The original runs the resolved path inside backticks, so the shell splits it
 * on the space before it ever runs. Assigning it to a variable and quoting the
 * expansion is the smallest change that fixes it without altering behaviour.
 */
const APP = {
  file: "ios/Baymax.xcodeproj/project.pbxproj",
  label: "Bundle React Native code and images",
  from:
    "\\n`\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`\\n",
  to:
    "\\nRN_XCODE_SCRIPT=$(\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\")\\n/bin/sh \\\"$RN_XCODE_SCRIPT\\\"\\n",
};

for (const target of [PODS, APP]) {
  if (!existsSync(target.file)) {
    console.log(`patch-path-space: ${target.label} — no project yet, skipped.`);
    continue;
  }

  const source = readFileSync(target.file, "utf8");

  if (source.includes(target.to)) {
    console.log(`patch-path-space: ${target.label} — already quoted.`);
    continue;
  }

  if (!source.includes(target.from)) {
    /*
     * Not treated as a failure. Expo or React Native may have fixed this
     * upstream, or reworded the phase — and guessing at a replacement would be
     * worse than saying nothing was changed.
     */
    console.log(
      `patch-path-space: ${target.label} — expected script not found. ` +
        "If the build fails on a truncated path, check this phase by hand.",
    );
    continue;
  }

  writeFileSync(target.file, source.replace(target.from, target.to), "utf8");
  console.log(`patch-path-space: ${target.label} — quoted.`);
}
