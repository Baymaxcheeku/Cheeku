# Landing page

The public marketing site for Cheeku AI. It is a separate project from the
app and shares nothing with it.

## Rules

- Everything for the site lives in this folder: code, assets, config and its
  own `package.json` once the stack is chosen.
- Nothing here imports from `mobile-react-native/` or the root `src/`, and
  nothing there imports from here.
- The root ESLint and TypeScript configs skip this folder, so the site brings
  its own tooling and can't break the app's checks.
- It deploys on its own. An app release never waits on the site, and the
  other way round.

## Status

Empty for now. The build brief comes next.
