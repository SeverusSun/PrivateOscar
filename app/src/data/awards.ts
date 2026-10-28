import type { AwardDef } from '@/types'

/**
 * 传统奖项（17 项，原「必选奖项」，默认开启、可开关）+ 可选奖项（20 项）；
 * 自定义奖项由用户自行添加。评选卡片的默认顺序以本数组为准。
 */
export const AWARDS: AwardDef[] = [
  { id: 'best-picture', name: '最佳影片', description: '伟大无需多言', required: true, kind: 'movie' },
  { id: 'wen-zhuangyuan', name: '文曲星', description: '核心立意 · 镜头语言 · 叙事节奏 · 剧本 · 台词 · 表演', required: false, kind: 'movie' },
  { id: 'wu-zhuangyuan', name: '武状元', description: '电影工业 · 感官刺激 · 视效 · 声效 · 配乐 · 服化道', required: false, kind: 'movie' },
  { id: 'favorite', name: '最爱影片', description: '纯私人偏爱，不问理由', required: true, kind: 'movie' },
  { id: 'best-chinese', name: '华语最佳影片', description: '妈妈，华语影坛还有救！', required: true, kind: 'movie' },
  { id: 'best-theatrical', name: '院线最佳影片', description: '21世纪依然走进电影院的理由', required: true, kind: 'movie' },
  { id: 'best-director', name: '最佳导演', description: '膜拜，五体投地', required: true, kind: 'manual' },
  { id: 'favorite-director', name: '最爱导演', description: '导，再拍一百部电影可以吗？！', required: false, kind: 'manual' },
  { id: 'best-screenplay', name: '最佳剧本', description: '电影是光影的文学', required: true, kind: 'movie' },
  { id: 'best-actor', name: '最佳男主角', description: '我仿佛可以看到他胡子的演技', required: true, kind: 'manual' },
  { id: 'best-actress', name: '最佳女主角', description: '演技如水：碧波荡漾，波澜壮阔', required: true, kind: 'manual' },
  { id: 'best-supporting-actor', name: '最佳男配角', description: '什么？我还以为他是男主角！', required: true, kind: 'manual' },
  { id: 'best-supporting-actress', name: '最佳女配角', description: '啊！她是配角嘛？', required: true, kind: 'manual' },
  { id: 'favorite-actor', name: '最爱男演员', description: 'bro，这简直就是我', required: false, kind: 'manual' },
  { id: 'favorite-actress', name: '最爱女演员', description: 'sis，这简直就是我', required: false, kind: 'manual' },
  { id: 'best-editing', name: '最佳剪辑', description: '蒙太奇的魅力', required: true, kind: 'movie' },
  { id: 'best-cinematography', name: '最佳摄影', description: '它的魅力让我的梦想是成为一位摄影师', required: true, kind: 'movie' },
  { id: 'best-vfx', name: '最佳视效', description: '----眼睛为什么是最重要的感官', required: true, kind: 'movie' },
  { id: 'best-sound', name: '最佳音效', description: '大饱耳福', required: true, kind: 'movie' },
  { id: 'best-score', name: '最佳配乐', description: 'OST是看完电影后不得不品的回味', required: true, kind: 'movie' },
  { id: 'best-costume', name: '最佳服化道', description: '我觉得，电影反映时代，服化道就是时代的物证', required: true, kind: 'movie' },
  { id: 'best-poster-design', name: '最佳海报设计', description: '打印下来挂床边', required: false, kind: 'manual' },
  { id: 'best-animation', name: '最佳动画', description: '抵达实拍无法实现的境界', required: true, kind: 'movie' },
  // 可选奖项
  { id: 'most-moving', name: '最感动', description: '世界真美好', required: false, kind: 'movie' },
  { id: 'most-shocking', name: '最震撼', description: '李安：我大受震撼.jpg', required: false, kind: 'movie' },
  { id: 'most-thrilling', name: '最爽', description: '爽就完了', required: false, kind: 'movie' },
  { id: 'most-avant-garde', name: '最前卫', description: '银幕正在慢慢变成现实', required: false, kind: 'movie' },
  { id: 'most-surprising', name: '最惊喜', description: '预期之外的好看', required: false, kind: 'movie' },
  { id: 'most-aftertaste', name: '最后劲', description: '想象这样一个场景：二十年后....', required: false, kind: 'movie' },
  { id: 'most-tearful', name: '最泪流', description: '记得带纸', required: false, kind: 'movie' },
  { id: 'most-laughing', name: '最大笑', description: '哈哈哈哈哈哈哈哈', required: false, kind: 'movie' },
  { id: 'most-empathy', name: '最共情', description: '看着银幕，我突然想到现实的那一刻', required: false, kind: 'movie' },
  { id: 'most-underrated', name: '最低估', description: '这评分是个外行', required: false, kind: 'movie' },
  { id: 'most-overrated', name: '最过誉', description: '盛名之下，其实难副', required: false, kind: 'movie' },
  { id: 'most-disagreed', name: '最不认同', description: '恕我难以认同', required: false, kind: 'movie' },
  { id: 'most-baffling', name: '最看不懂', description: '李安：我看不懂.jpg', required: false, kind: 'movie' },
  { id: 'most-disappointing', name: '最失望', description: '你对得起我的期待嘛呜呜', required: false, kind: 'movie' },
  { id: 'most-anticipated', name: '最期待', description: '快点上映吧！', required: false, kind: 'movie', pool: 'wish' },
]

export const REQUIRED_AWARDS = AWARDS.filter((a) => a.required)
export const OPTIONAL_AWARDS = AWARDS.filter((a) => !a.required)

/** 由必选奖项移入可选奖项、展示在可选奖项最前面的奖项 id（按展示顺序） */
export const MOVED_TO_FRONT_IDS = [
  'wen-zhuangyuan',
  'wu-zhuangyuan',
  'favorite-director',
  'favorite-actor',
  'favorite-actress',
  'best-poster-design',
]

/** 可选奖项（含移入的 6 项排在最前），用于评选界面的可选奖项区域 */
export const ORDERED_OPTIONAL_AWARDS = [
  ...MOVED_TO_FRONT_IDS.map((id) => OPTIONAL_AWARDS.find((a) => a.id === id)!),
  ...OPTIONAL_AWARDS.filter((a) => !MOVED_TO_FRONT_IDS.includes(a.id)),
]
