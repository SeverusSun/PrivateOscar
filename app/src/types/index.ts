export type MovieStatus = 'wish' | 'doing' | 'done'

export interface PersonLite {
  id: string
  name: string
  /** 豆瓣演职员照片（演职员接口补全后可用） */
  avatar?: string
}

/** 一条电影词条（来自豆瓣账户的同步记录 + 详情补全 + 本地可编辑） */
export interface MovieEntry {
  id: string // 豆瓣 subject id
  title: string
  originalTitle: string
  year: string
  poster: string
  intro: string
  doubanRating: number | null // 0-10
  ratingCount: number
  genres: string[]
  directors: PersonLite[]
  actors: PersonLite[]
  status: MovieStatus // 想看 / 在看 / 看过
  markedAt: string // 账户记录时间
  userRating: number | null // 用户打分 1-5 星
  shortComment: string // 短评
  longReview: string // 长篇影评（可同步或手动补录）
}

/** 人物类奖项（最佳导演/男女主配/最爱导演/最佳海报设计）手动录入的人物信息 */
export interface PersonEntry {
  name: string
  image: string // 图片 URL 或 base64
  intro: string
  movieTitle: string // 关联影片名（可选展示）
}

export interface Nomination {
  movieId: string
  note?: string
  /** 该提名对应的人物资料（每个奖项的每个提名均可手动上传照片/姓名/简介）；人物奖项未上传时自动匹配豆瓣演职员照片 */
  person?: PersonEntry
}

/** 特殊词条：「未定」占位（海报显示奖项名但影片信息为未定） */
export const TBD_ID = '__TBD__'

/** 每个奖项的评选结果 */
export interface AwardResult {
  awardId: string
  winner: Nomination | null // 最终获奖（从提名中选出）
  nominations: Nomination[]
  person: PersonEntry | null // 旧版兼容字段，不再使用
  /** 最终获奖未定：开启后清空获奖，海报获奖位显示未定 */
  winnerTbd?: boolean
  /** 自定义颁奖词（展示优先级：文本输入 > 电影短评 > 奖项说明，逐级回退） */
  citation?: string
}

export interface Profile {
  uid: string
  name: string
  avatar: string
  syncedAt: string
}

export type AwardKind = 'movie' | 'manual'

export interface AwardDef {
  id: string
  name: string
  description: string
  required: boolean
  kind: AwardKind
  /** 提名池：从「看过」或「想看」词条中挑选（默认看过） */
  pool?: 'done' | 'wish'
}
