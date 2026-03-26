// import prettier from 'eslint-config-prettier'
import solid from 'eslint-plugin-solid'
import globals from 'globals'

import js from '@eslint/js'

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ['**/*.{js,jsx}']
    },

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        }
    },

    js.configs.recommended,

    {
        plugins: {
            solid
        },
        rules: {
            // Solid
            'solid/reactivity': 'warn',
            'solid/no-destructure': 'off',

            // Base rules
            'no-console': 'warn',
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_'
                }
            ],

            // Style (delegado parcialmente a Prettier)
            indent: [
                'off',
                4,
                {
                    SwitchCase: 1,
                    flatTernaryExpressions: true
                }
            ],
            semi: ['error', 'never'],
            'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }]
        }
    }

    // evita conflictos con prettier
    // prettier
]
