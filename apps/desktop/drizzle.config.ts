import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './drizzle/schema.ts',
  dialect: 'sqlite',
  schemaFilter: 'public',
  verbose: true,
  strict: true,
});