import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
    ".git/**",
    // Config files allowed to use require()
    "*.config.js",
    "*.config.mjs",
    ".lintstagedrc.js",
    "commitlint.config.js",
  ]),
  {
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],

      // React strict rules
      "react/no-unescaped-entities": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Next.js strict rules
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "warn",

      // General code quality rules
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],

      // Disable règles trop strictes
      "react/display-name": "off",
    },
  },
]);

export default eslintConfig;
