// ESLint flat config (ESLint 10). eslint-config-next ships flat configs, so no
// compatibility layer is needed.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "rudraksh-collection-app/**", "public/sw.js", "next-env.d.ts"],
  },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      // Reading browser-only state (saved bag, wishlist, screen size) after the
      // first render is deliberate: it keeps server and browser HTML identical.
      "react-hooks/set-state-in-effect": "warn",
      // Date.now() in admin views and save handlers is intended.
      "react-hooks/purity": "warn",
      "import/no-absolute-path": "error",
      "import/no-self-import": "error",
      "import/no-useless-path-segments": "error",
    },
  },
];

export default eslintConfig;
