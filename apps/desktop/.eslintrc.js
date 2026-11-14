module.exports = [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: '@typescript-eslint/parser',
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/src/**/*.{ts,tsx}'],
    plugins: ['react'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: '@typescript-eslint/parser',
      react: {
        version: '18',
      },
    },
    rules: {
      'react/react-dom-no-fragments': 'warn',
      'react/jsx-uses-react': 'warn',
    },
  },
];