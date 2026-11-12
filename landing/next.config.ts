import path from "node:path";

import type { NextConfig } from "next";

// A static site: `next build` writes plain files to out/, ready for any host.
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // This folder is its own project. Without this, Next walks up to the repo
  // root (it has a lockfile too) and tries to build the app's files.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default config;
