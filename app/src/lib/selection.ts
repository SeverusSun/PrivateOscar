import type { AppState } from '@/lib/storage'
import { TBD_ID, type AwardDef, type MovieEntry, type PersonEntry } from '@/types'
import {
  createUuid32,
  type MovieSnapshot,
  type PersonSnapshot,
  type SelectionSnapshot,
} from '@/shared/selection'

const TOP_CATEGORY_KEYS: Record<string, string> = {
  最佳: 'best',
  最爱: 'favorite',
  导演: 'director',
  男演: 'actor',
  女演: 'actress',
  科幻: 'science-fiction',
  剧情: 'drama',
  爱情: 'romance',
  家庭: 'family',
  惊悚: 'thriller',
  奇幻: 'fantasy',
  喜剧: 'comedy',
  历史: 'history',
  战争: 'war',
  歌舞: 'musical',
  同性: 'lgbtq',
  动画: 'animation',
}

function movieSnapshot(movie: MovieEntry): MovieSnapshot {
  return {
    movieId: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle || undefined,
    year: movie.year || undefined,
    doubanRating: movie.doubanRating,
    poster: movie.poster || undefined,
    directors: movie.directors.map(({ id, name }) => ({ id, name })),
    actors: movie.actors.map(({ id, name }) => ({ id, name })),
  }
}

function isDirectorCategory(...ids: string[]): boolean {
  return ids.some((id) => id === 'best-director' || id === 'favorite-director' || id === 'top-director' || id === '导演')
}

function personSnapshot(
  person: PersonEntry | undefined,
  movie: MovieEntry,
  categoryId: string,
): PersonSnapshot | null {
  if (person?.name.trim()) {
    return {
      name: person.name.trim(),
      image: person.image && !person.image.startsWith('data:') ? person.image : undefined,
      intro: person.intro || undefined,
    }
  }
  if (isDirectorCategory(categoryId) && movie.directors[0]?.name) {
    return { name: movie.directors[0].name, doubanId: movie.directors[0].id || undefined }
  }
  return null
}

export function createSelectionSnapshot(
  state: AppState,
  activeAwards: AwardDef[],
  now = new Date(),
  mode: 'oscars' | 'top' = state.awardMode,
): SelectionSnapshot {
  if (!state.profile) throw new Error('请先同步豆瓣账户，再生成评选数据')
  const movieById = new Map(state.movies.map((movie) => [movie.id, movie]))
  const common = {
    schemaVersion: 1 as const,
    selectionId: createUuid32(),
    owner: { uid: state.profile.uid, name: state.profile.name },
    scope: state.career
      ? { type: 'career' as const, year: null }
      : { type: state.yearMode, year: state.year },
    createdAt: now.toISOString(),
  }

  if (mode === 'top') {
    const custom = !Object.hasOwn(TOP_CATEGORY_KEYS, state.topCategory)
    return {
      ...common,
      mode: 'top',
      topCategory: {
        key: custom ? `custom:${encodeURIComponent(state.topCategory)}` : TOP_CATEGORY_KEYS[state.topCategory],
        name: state.topCategory,
        custom,
      },
      awards: [],
      topPicks: Object.entries(state.topPicks)
        .map(([rank, pick]) => ({ rank: Number(rank), pick }))
        .filter(({ rank, pick }) => Number.isInteger(rank) && rank >= 1 && rank <= state.topN && movieById.has(pick.movieId))
        .sort((a, b) => a.rank - b.rank)
        .map(({ rank, pick }) => {
          const movie = movieById.get(pick.movieId)!
          return {
            rank,
            movie: movieSnapshot(movie),
            person: personSnapshot(pick.person, movie, state.topCategory),
            citation: pick.citation?.trim() || null,
          }
        }),
    }
  }

  return {
    ...common,
    mode: 'oscars',
    topCategory: null,
    awards: activeAwards.map((award) => {
      const result = state.results[award.id]
      const nominations = (result?.nominations ?? [])
        .filter((nomination) => nomination.movieId !== TBD_ID && movieById.has(nomination.movieId))
        .map((nomination) => {
          const movie = movieById.get(nomination.movieId)!
          return {
            movie: movieSnapshot(movie),
            person: personSnapshot(nomination.person, movie, award.id),
          }
        })
      const winner = result?.winner && result.winner.movieId !== TBD_ID ? result.winner : null
      const status = result?.winnerTbd
        ? 'winner-tbd' as const
        : result?.nominations.some((nomination) => nomination.movieId === TBD_ID)
          ? 'nominations-tbd' as const
          : winner
            ? 'decided' as const
            : 'pending' as const
      const winnerMovie = winner ? movieById.get(winner.movieId) : undefined
      return {
        awardId: award.id,
        awardName: award.name,
        awardKind: award.kind,
        required: award.required,
        status,
        winnerMovieId: status === 'decided' ? winner!.movieId : null,
        nominations,
        citation: status === 'decided'
          ? result?.citation?.trim() || winnerMovie?.shortComment.trim() || award.description.trim() || null
          : result?.citation?.trim() || null,
      }
    }),
    topPicks: [],
  }
}
