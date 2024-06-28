import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://data.rcsb.org/graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/utils/__graphql__/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      }
    }
  },
  ignoreNoDocuments: true,
};

export default config;