import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'
import { ensureSqliteDatabaseUrl } from './src/config/sqlite-database.ts'

ensureSqliteDatabaseUrl()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
