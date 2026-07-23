import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        fetch: "readonly",
        URL: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        alert: "readonly",
        process: "readonly",
        __dirname: "readonly",
        // Service Worker globals
        self: "readonly",
        caches: "readonly",
        // Test globals
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        vi: "readonly",
        // React/Next.js globals
        React: "readonly",
        JSX: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Allow unused vars for React components (props)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_", 
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true 
      }],
      // Disable no-undef for TypeScript files (TypeScript handles this)
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.js"],
    rules: {
      // Re-enable no-undef for JavaScript files
      "no-undef": "error",
    },
  },
  {
    ignores: [
      ".next/**", 
      "out/**", 
      "build/**", 
      "next-env.d.ts", 
      "node_modules/**",
      "Footer FE/**", // Ignore the problematic Footer FE directory
      "public/sw.js", // Ignore service worker
    ],
  },
];
