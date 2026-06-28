import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // Ignorierte Verzeichnisse
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Backend + Scripts: Node.js-Globals (console, process, …)
  {
    files: ["packages/backend/**/*.{ts,mjs,js}", "packages/backend/scripts/**"],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Frontend: Browser-Globals + React-Regeln
  {
    files: ["packages/frontend/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "warn",
      "react/prop-types": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // Projektweite Regel-Anpassungen:
  // any und unused-vars sind in der bestehenden Codebase verbreitet;
  // als warn statt error, damit CI nicht blockiert wird.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
