import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactHooksExtra from "eslint-plugin-react-hooks-extra";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginReactPerf from "eslint-plugin-react-perf";
import pluginImport from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    ignores: ["src/components/LhasaReact/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      import: pluginImport,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Additional globals that might be needed
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
    rules: {
      // Import/Export rules
      "import/no-unresolved": "off", // TypeScript handles this
      "import/named": "off", // TypeScript handles this
      "import/default": "off", // TypeScript handles this
      "import/no-named-as-default-member": "off", // TypeScript handles this
      "import/no-duplicates": "error",
      "import/order": ["warn", {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "never"
      }],
      "import/newline-after-import": "warn",
      "import/no-useless-path-segments": "warn",
    },
  },
  // CommonJS files configuration
  {
    files: ["**/*.cjs", "**/.eslintrc.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        module: "writable",
        exports: "writable",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
      sourceType: "script",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        React: "readonly", // Make React available globally for TypeScript files too
        NodeJS: "readonly", // Node.js globals for TypeScript
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "react-hooks-extra": pluginReactHooksExtra,
      "jsx-a11y": pluginJsxA11y,
      "react-refresh": pluginReactRefresh,
      "react-perf": pluginReactPerf,
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      globals: {
        React: "readonly", // Make React available globally for JSX
        NodeJS: "readonly", // Node.js globals for TypeScript
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React core rules
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ doesn't need React in scope
      "react/prop-types": "warn", // Encourage prop validation
      "react/jsx-uses-react": "off", // Not needed with new JSX transform
      "react/jsx-uses-vars": "error",
      "react/jsx-key": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-unknown-property": "error",
      "react/no-unescaped-entities": "warn",
      
      // Disable no-undef for React since it's not needed in React 17+
      "no-undef": ["error", { "typeof": false }],
      
      // React Hooks rules
      ...pluginReactHooks.configs.recommended.rules,
      "react-hooks/react-compiler": "error",
      "react-hooks/exhaustive-deps": "off", // Disable exhaustive-deps rule, it is the limit of how much I can accept the React way of life.
      
      // React Hooks Extra rules
      "react-hooks-extra/no-direct-set-state-in-use-effect": "warn",
      "react-hooks-extra/no-redundant-custom-hook": "warn",
      "react-hooks-extra/prefer-use-state-lazy-initialization": "warn",
      "react-hooks-extra/no-unnecessary-use-callback": "warn",
      "react-hooks-extra/no-unnecessary-use-memo": "warn",
      
      // Accessibility rules
      ...pluginJsxA11y.configs.recommended.rules,
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      
      // React Refresh rules (for development)
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      
      // React Performance rules
      //"react-perf/jsx-no-new-object-as-prop": "warn",
      //"react-perf/jsx-no-new-array-as-prop": "warn",
      //"react-perf/jsx-no-new-function-as-prop": "warn", // Uncomment if you want to enforce this rule, but flag things that should be sorted by the compiler
      //"react-perf/jsx-no-jsx-as-prop": "warn",

      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn"

    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];