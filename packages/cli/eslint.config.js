// @ts-check

import eslint from "@eslint/js";

import tseslint from "typescript-eslint";

export default tseslint.config(
  tseslint.configs.recommendedTypeChecked,
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
