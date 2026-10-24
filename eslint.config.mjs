import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// eslint-config-next 15 ships eslintrc-style configs, so they are bridged here.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".designvenv/**",
      // Deno code, deployed to Supabase, with its own imports and globals.
      "supabase/functions/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...tseslint.configs.strict,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // The service-role key bypasses RLS. Client bundles must never reach for it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/env.ts", "src/app/api/**", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Import from '@/lib/env' instead. Direct process.env reads risk leaking server-only secrets into a client bundle.",
        },
      ],
    },
  },
  {
    // A test asserting on a shape it just created should fail loudly on a wrong
    // assumption, not be forced to narrow it away.
    files: ["src/**/*.test.{ts,tsx}", "e2e/**/*.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // The mobile design scales (UI audit, October 2026). Type, radius and
    // colour each drifted into dozens of one-off values; these keep them on
    // the scales in mobile-react-native/src/theme/tokens.ts. Warnings, not
    // errors: the remaining illustration colours are a known backlog.
    files: ["mobile-react-native/app/**/*.{ts,tsx}", "mobile-react-native/src/**/*.{ts,tsx}"],
    ignores: ["mobile-react-native/src/theme/**", "mobile-react-native/src/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Property[key.name='fontSize'] > Literal[value<36]:not([value=10],[value=11],[value=12],[value=13],[value=15],[value=17],[value=20],[value=24],[value=28],[value=34]), Property[key.name='fontSize'] > ConditionalExpression > Literal[value<36]:not([value=10],[value=11],[value=12],[value=13],[value=15],[value=17],[value=20],[value=24],[value=28],[value=34])",
          message: "Off the type scale. Use 11, 12, 13, 15, 17, 20, 24, 28 or 34 (10 for counters, 36+ for display). See `type` in theme/tokens.ts.",
        },
        {
          selector:
            "Property[key.name=/^border(Top|Bottom)?(Left|Right)?Radius$/] > Literal[value>6][value<999]:not([value=8],[value=12],[value=16],[value=24],[value=32]), Property[key.name=/^border(Top|Bottom)?(Left|Right)?Radius$/] > ConditionalExpression > Literal[value>6][value<999]:not([value=8],[value=12],[value=16],[value=24],[value=32])",
          message: "Off the radius scale. Use 8, 12, 16, 24, 32 or 999 (6 and under is free for hairlines). See `radius` in theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/^#(?!(fff|ffffff|000|000000)$)[0-9a-fA-F]{3,8}$/]",
          message: "Raw hex colour. Use brand, ink, surface, hue, lilac or semantic from theme/tokens.ts.",
        },
        {
          selector: "Literal[value=/(^|\\s)(text|rounded(-[tblr]{1,2})?)-\\[[0-9.]+px\\]/]",
          message: "Arbitrary size class. Use the named scale (text-xs..text-4xl, rounded-sm..rounded-2xl).",
        },
      ],
    },
  },
];

export default eslintConfig;
