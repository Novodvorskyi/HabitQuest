import js from "@eslint/js";
import globals from "globals";

export default [
  // Використовуємо рекомендовані правила ESLint
  js.configs.recommended,
  
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      // Змінюємо globals.browser на комбінацію Node та Jest
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Тут можна додати власні правила або змінити існуючі
      "no-unused-vars": "warn", // Робимо попередженням замість помилки
    },
  },
  
  // Специфічне налаштування для CommonJS файлів
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  
  // Ігнорування службових папок (аналог .eslintignore)
  {
    ignores: ["node_modules/", "coverage/"]
  }
];