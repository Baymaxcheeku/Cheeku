# Toolchain notes

Two install hazards cost time on the first scaffold. Both are recorded here
because the symptom points nowhere near the cause.

## 1 · `Cannot read properties of undefined (reading 'transformFile')`

Metro fails to construct a transformer and reports it as a property access on
`undefined`. Two real causes, both seen here:

- **A stray hoisted `metro`.** Expo SDK 57 ships its own fork at
  `@expo/metro`. NativeWind (via `react-native-css-interop`) pulls a plain
  `metro` in, which then wins resolution and exposes a different internal
  layout. `npx expo install --fix` realigns it.
- **A missing `babel-preset-expo`.** The real message is one line above and is
  easy to miss: `Failed to construct transformer: Error: Cannot find module
  'babel-preset-expo'`. Installing it fixed the bundle.

If the bundler breaks, read the line *above* the TypeError before anything
else.

## 2 · `--legacy-peer-deps` is required

`.npmrc` pins it. NativeWind's web support drags in `react-dom@19.2.8`, which
peer-requires `react@^19.2.8`, while Expo SDK 57 pinned `react@19.2.3` (SDK 58 pins `19.3.0`; the flag stays). Without
the flag npm refuses the whole install.

## 3 · DiceBear must stay on v9

`@dicebear/core@10` removed the `createAvatar` export that
`src/lib/profiles/avatar.ts` uses. Pinned to `^9.4.3`, matching the web app.

## Verify a change to the toolchain

```bash
npx tsc --noEmit
npx vitest run
npx expo export --platform ios --output-dir /tmp/expo-check
```

The export is the only one of the three that exercises Metro, Babel and
NativeWind together. Typecheck and tests both pass in states where the app
cannot bundle at all.
