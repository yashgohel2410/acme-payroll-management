import { z } from 'zod'

export const recentRevisionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export type RecentRevisionsQuery = z.infer<typeof recentRevisionsQuerySchema>
