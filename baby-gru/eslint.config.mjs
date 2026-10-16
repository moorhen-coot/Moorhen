import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "src/components/LhasaReact/**",
    ],
  },

  // Base recommended rules (JS + TypeScript)
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Language options & globals for all source files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Additional globals used by the codebase
        module: "readonly",
        GLint: "readonly",
        BlobPart: "readonly",
        RequestInfo: "readonly",
        RequestInit: "readonly",
        DisplayBuffer: "readonly",
        LocalForage: "readonly",
        emscripten: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  // CommonJS config files
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        module: "writable",
        exports: "writable",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
      sourceType: "commonjs",
    },
  },

  // React rules
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],

  // React Hooks rules (config is legacy-style, register manually)
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs["recommended-latest"].rules,
    },
  },

  // React Refresh (Vite)
  pluginReactRefresh.configs.vite,

  // JSX accessibility (plugin config is legacy-style, register manually)
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "jsx-a11y": pluginJsxA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...pluginJsxA11y.configs.recommended.rules,
    },
  },

  // Project-specific tweaks (applied last so they win)
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Moorhen also runs inside <moorhen-web-component>, where the whole UI is in a shadow root. There, these
  // document-level lookups cannot see Moorhen's elements (they return null, or the host element).
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "src/index.tsx", // mounts the app into the host page
      "src/WebComponent/utils/**", // host-page hooks that look up the <moorhen-web-component> element itself
      "src/utils/shadowDom.ts", // the shadow-aware helpers below
      "src/utils/tex-svg.js", // vendored MathJax bundle
      "src/LhasaReact/**", // separate project copied in at build time; its lookups need fixing there
    ],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["getElementById", "querySelector", "querySelectorAll", "getElementsByClassName", "getElementsByTagName", "getElementsByName"].map(
          property => ({
            object: "document",
            property,
            message:
              "Cannot see inside the web component's shadow root. Use a React ref for an element this component renders, or node.getRootNode() for one rendered elsewhere.",
          })
        ),
        ...["activeElement", "elementFromPoint", "elementsFromPoint"].map(property => ({
          object: "document",
          property,
          message:
            "Stops at the web component's host element. Use getDeepActiveElement / getEventOrigin from src/utils/shadowDom.ts.",
        })),
      ],
    },
  },
  {
    settings: {
      react: {
        version: "19.2",
      },
    },
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },
);
