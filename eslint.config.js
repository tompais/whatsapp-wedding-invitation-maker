// @ts-check
const tseslint = require("typescript-eslint");
const prettierConfig = require("eslint-config-prettier");

module.exports = tseslint.config(
  // Reglas recomendadas de TypeScript
  ...tseslint.configs.recommended,
  // Deshabilitar reglas de ESLint que conflictúan con Prettier
  prettierConfig,
  {
    rules: {
      // Sin uso de `any` explícito — usar tipos concretos o `unknown`
      "@typescript-eslint/no-explicit-any": "error",
      // Variables declaradas deben usarse (ignorar args con prefijo _)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Sin imports de namespace (usar named imports)
      "@typescript-eslint/no-namespace": "error",
    },
  },
  {
    // Ignorar archivos generados y dependencias
    ignores: ["node_modules/**", "dist/**", "output/**", "*.config.js"],
  }
);
