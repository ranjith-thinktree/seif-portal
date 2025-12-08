module.exports = {
  env: {
    browser: true, // add this if you’re also linting frontend JS
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Enables Prettier plugin + disables conflicting ESLint rules
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // ✅ General Best Practices
    eqeqeq: 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-console': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // ✅ Code Style (Prettier handles most, but we keep essentials)
    indent: ['error', 2],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never'],

    // ✅ Make Prettier formatting errors visible in ESLint
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: true,
        trailingComma: 'none',
        tabWidth: 2,
        printWidth: 100,
        arrowParens: 'always',
        endOfLine: 'lf',
      },
    ],
  },
};
