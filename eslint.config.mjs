import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// eslint-config-next 15 ships eslintrc-style configs, so they are bridged here.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", ".designvenv/**"] },
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
];

export default eslintConfig;
