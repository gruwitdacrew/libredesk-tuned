import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config([
	{
		ignores: ['**', '!apps/widget/**', 'node_modules/**', 'dist/**'],
	},

	js.configs.recommended,

	{
		files: ['apps/widget/src/**/*.ts'],
		extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname,
			},
			globals: {
				...globals.browser,
			},
		},
		plugins: {
			import: importPlugin,
			unicorn,
		},
		rules: {
			/*
			 * Архитектура
			 */
			'import/no-restricted-paths': [
				'error',
				{
					zones: [
						{ target: './apps/widget/src/core', from: './apps/widget/src/ui' },
						{ target: './apps/widget/src/core', from: './apps/widget/src/transport' },
						{ target: './apps/widget/src/core', from: './apps/widget/src/widget.ts' },
						{ target: './apps/widget/src/transport', from: './apps/widget/src/ui' },
						{ target: './apps/widget/src/transport', from: './apps/widget/src/widget.ts' },
						{ target: './apps/widget/src/ui', from: './apps/widget/src/transport' },
						{ target: './apps/widget/src/ui', from: './apps/widget/src/widget.ts' },
					],
				},
			],

			/*
			 * Base JS
			 */
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			curly: ['error', 'all'],
			eqeqeq: ['error', 'always'],
			'object-shorthand': ['error', 'always'],
			'no-var': 'error',
			'prefer-const': 'error',
			'no-restricted-globals': [
				'error',
				{ name: 'event', message: 'Используй параметр обработчика' },
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: "MemberExpression[property.name='innerHTML'][object.type!='ThisExpression']",
					message: 'innerHTML — потенциальный XSS. Используй textContent или DOM API.',
				},
			],

			/*
			 * Imports
			 */
			'import/no-duplicates': 'error',

			/*
			 * TypeScript strictness
			 */
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/strict-boolean-expressions': [
				'error',
				{
					allowNullableBoolean: false,
					allowNullableNumber: false,
					allowNullableString: false,
				},
			],
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: true,
				},
			],
			'@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
			'@typescript-eslint/member-ordering': 'error',

			/*
			 * Unicorn
			 */
			'unicorn/filename-case': ['error', { case: 'camelCase' }],
			'unicorn/prefer-query-selector': 'error',
			'unicorn/prefer-string-slice': 'error',
			'unicorn/prefer-string-replace-all': 'error',
			'unicorn/prefer-structured-clone': 'error',
			'unicorn/no-array-for-each': 'error',
			'unicorn/prefer-array-find': 'error',
			'unicorn/prefer-array-some': 'error',
			'unicorn/prefer-modern-dom-apis': 'error',
		},
	},

	{
		files: ['*.config.{js,ts,mjs}', 'eslint.config.js', 'vite.config.ts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
]);
