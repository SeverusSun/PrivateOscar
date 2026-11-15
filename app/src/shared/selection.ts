import { z } from 'zod'

export const SELECTION_SCHEMA_VERSION = 1 as const
export const ID_PATTERN = /^[0-9a-f]{32}$/

export const personSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(100),
  doubanId: z.string().max(100).optional(),
  image: z.string().url().optional(),
  intro: z.string().max(5000).optional(),
})

export const movieSnapshotSchema = z.object({
  movieId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300),
  originalTitle: z.string().max(300).optional(),
  year: z.string().max(20).optional(),
  poster: z.string().optional(),
  directors: z.array(z.object({ id: z.string(), name: z.string() })).max(50),
  actors: z.array(z.object({ id: z.string(), name: z.string() })).max(100),
})

export const nominationSnapshotSchema = z.object({
  movie: movieSnapshotSchema,
  person: personSnapshotSchema.nullable(),
})

export const awardSnapshotSchema = z.object({
  awardId: z.string().trim().min(1).max(160),
  awardName: z.string().trim().min(1).max(200),
  awardKind: z.enum(['movie', 'manual']),
  required: z.boolean(),
  status: z.enum(['pending', 'nominations-tbd', 'winner-tbd', 'decided']),
  winnerMovieId: z.string().nullable(),
  nominations: z.array(nominationSnapshotSchema).max(9),
  citation: z.string().max(10000).nullable(),
}).superRefine((award, ctx) => {
  if (award.status === 'decided' && !award.winnerMovieId) {
    ctx.addIssue({ code: 'custom', message: '已评出奖项必须包含获奖者' })
  }
  if (award.status !== 'decided' && award.winnerMovieId) {
    ctx.addIssue({ code: 'custom', message: '未评出奖项不能包含获奖者' })
  }
  if (award.status === 'decided' && !award.nominations.some((n) => n.movie.movieId === award.winnerMovieId)) {
    ctx.addIssue({ code: 'custom', message: '获奖者必须属于提名集合' })
  }
})

export const topPickSnapshotSchema = z.object({
  rank: z.number().int().min(1).max(99),
  movie: movieSnapshotSchema,
  person: personSnapshotSchema.nullable(),
  citation: z.string().max(10000).nullable(),
})

export const topCategorySnapshotSchema = z.object({
  key: z.string().trim().min(1).max(300),
  name: z.string().trim().min(1).max(200),
  custom: z.boolean(),
})

export const selectionSnapshotSchema = z.object({
  schemaVersion: z.literal(SELECTION_SCHEMA_VERSION),
  selectionId: z.string().regex(ID_PATTERN),
  owner: z.object({
    uid: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
  }),
  mode: z.enum(['oscars', 'top']),
  scope: z.object({
    type: z.enum(['career', 'marked', 'release']),
    year: z.number().int().min(1800).max(9999).nullable(),
  }),
  topCategory: topCategorySnapshotSchema.nullable(),
  createdAt: z.string().datetime(),
  awards: z.array(awardSnapshotSchema).max(200),
  topPicks: z.array(topPickSnapshotSchema).max(99),
}).superRefine((selection, ctx) => {
  if (selection.scope.type === 'career' && selection.scope.year !== null) {
    ctx.addIssue({ code: 'custom', message: '光影生涯评选不应包含年份' })
  }
  if (selection.scope.type !== 'career' && selection.scope.year === null) {
    ctx.addIssue({ code: 'custom', message: '年度评选必须包含年份' })
  }
  if (selection.mode === 'oscars' && (selection.topCategory !== null || selection.topPicks.length > 0)) {
    ctx.addIssue({ code: 'custom', message: '奥斯卡评选不能包含 Top 类别或名次' })
  }
  if (selection.mode === 'top' && (selection.topCategory === null || selection.awards.length > 0)) {
    ctx.addIssue({ code: 'custom', message: 'Top 评选必须包含类别且不能包含奖项' })
  }
  const ranks = selection.topPicks.map((pick) => pick.rank)
  if (new Set(ranks).size !== ranks.length) {
    ctx.addIssue({ code: 'custom', message: 'Top 名次不能重复' })
  }
})

export const posterTypeSchema = z.enum(['oscar', 'nominations', 'top'])

export type PersonSnapshot = z.infer<typeof personSnapshotSchema>
export type MovieSnapshot = z.infer<typeof movieSnapshotSchema>
export type AwardSnapshot = z.infer<typeof awardSnapshotSchema>
export type TopPickSnapshot = z.infer<typeof topPickSnapshotSchema>
export type SelectionSnapshot = z.infer<typeof selectionSnapshotSchema>
export type PosterType = z.infer<typeof posterTypeSchema>

export function createUuid32(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '')
}

export function selectionLogicalKey(selection: Pick<SelectionSnapshot, 'owner' | 'mode' | 'scope' | 'topCategory'>): string {
  return JSON.stringify([
    selection.owner.uid,
    selection.mode,
    selection.scope.type,
    selection.scope.year,
    selection.topCategory?.key ?? null,
  ])
}
