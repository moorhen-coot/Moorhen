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
      },
      config: {
        // client-preset 6 types custom scalars (e.g. RCSB's Date) as unknown; keep them as any, as before
        defaultScalarType: 'any',
      }
    }
  },
  ignoreNoDocuments: true,
};

export default config;