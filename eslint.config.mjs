import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'type:utils',
              onlyDependOnLibsWithTags: ['type:utils'],
            },
            {
              sourceTag: 'type:engine',
              onlyDependOnLibsWithTags: ['type:engine', 'type:utils'],
            },
            {
              sourceTag: 'type:plugins',
              onlyDependOnLibsWithTags: ['type:plugins', 'type:engine', 'type:utils'],
            },
            {
              sourceTag: 'type:client',
              onlyDependOnLibsWithTags: [
                'type:client',
                'type:engine',
                'type:plugins',
                'type:utils',
                'type:hmr',
              ],
            },
            {
              sourceTag: 'type:server',
              onlyDependOnLibsWithTags: [
                'type:server',
                'type:engine',
                'type:plugins',
                'type:utils',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": "off",
    },
  },
];
