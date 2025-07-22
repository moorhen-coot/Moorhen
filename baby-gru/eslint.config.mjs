import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import pluginReactPerf from "eslint-plugin-react-perf";
import pluginImport from "eslint-plugin-import";

export default [
  js.configs.recommended,
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
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
      "react-refresh": pluginReactRefresh,
      "react-perf": pluginReactPerf,
    },
    languageOptions: {
      globals: {
        React: "readonly", // Make React available globally for JSX
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
      "react-perf/jsx-no-new-object-as-prop": "warn",
      "react-perf/jsx-no-new-array-as-prop": "warn",
      "react-perf/jsx-no-new-function-as-prop": "warn",
      "react-perf/jsx-no-jsx-as-prop": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];