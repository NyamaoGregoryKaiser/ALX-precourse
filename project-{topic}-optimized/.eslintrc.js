module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true // Enable Jest global variables
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended' // Integrates Prettier with ESLint
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        semi: true,
        printWidth: 120
      }
    ]
  }
};