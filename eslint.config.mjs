import tseslint from 'typescript-eslint';

export default [{ ignores: ['**/dist/**', '**/node_modules/**', 'docs/generated/**'] }, { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } }];
