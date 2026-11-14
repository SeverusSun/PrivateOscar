# Private_Oscar（私人奥斯卡）

基于你的豆瓣书影音档案，举办一场完全属于你自己的电影奥斯卡，并生成可以分享的专属海报。

A personal "Academy Awards" website: import your Douban movie archive, nominate winners across classic and custom award categories, rank your Top movies, and export shareable posters.

**数据仅保存在你自己的浏览器本地（localStorage），不经过任何服务器，不上传、不分享。**

## 界面一览

本站共六个界面，点击跳转各界面的详细介绍：

| 界面 | 说明 | 详细文档 |
|---|---|---|
| 同步 | 抓取豆瓣账户「想看 / 在看 / 看过」的全部电影词条，可手动补录遗漏影片 | [同步](docs/同步.md) |
| 影库 | 浏览与筛选已同步的词条，查看详情、修改评分与影评、手动补录 | [影库](docs/影库.md) |
| 评选 | 举办私人奥斯卡（38 个内置奖项 + 自定义奖项），或排出 Top N 片单 | [评选](docs/评选.md) |
| 奥斯卡 | 导出私人奥斯卡主海报与完整提名名单海报（JPEG） | [奥斯卡](docs/奥斯卡.md) |
| Top榜 | 导出「Top N」榜单图片 | [Top榜](docs/Top榜.md) |
| 关于 | 站点信息、功能一览、数据与隐私、作者信息 | [关于](docs/关于.md) |

## 界面设计

- **整体风格**：仿豆瓣的绿色基调（豆瓣绿 `#007722`），衬线字体，简洁卡片式布局；顶部为六个界面的导航标签。
- **海报配色**：获奖烫金 `#c9a227`、提名墨绿 `#1b4332`、豆瓣评分橙 `#e09015`；Top 榜前三名使用金银铜三色。
- **交互细节**：提示消息从底部浮出（2 秒自动消失，不遮挡导航）；奖项/名次卡片支持折叠与 ⠿ 拖拽排序；状态徽标四态（已评出 / 获奖未定 / 提名未定 / 待评选）。

## 快速开始

```bash
cd app
npm install
npm run dev
```

浏览器访问终端中输出的地址（例如 `http://localhost:3000`）。

## 构建与部署

```bash
npm run build   # 产物在 app/dist，纯静态文件
```

`dist` 由任意静态服务器托管即可；豆瓣数据与图片依赖同源反向代理（开发环境由 Vite 提供，生产环境由 Nginx 提供），详见 [docs/关于.md](docs/关于.md) 的技术说明。

## 技术栈

Vite · React 19 · TypeScript · Tailwind CSS · shadcn/ui（Radix Primitives）· React Router · html-to-image

海报由 DOM 离线渲染导出 JPEG，并嵌入 EXIF 元数据（作者、海报类型、评选范围等）便于日后整理；豆瓣图片走本地代理以避免跨域污染导出画布，标题字体使用系统楷体。

## 免责声明

本站为非商业个人项目；电影海报、评分等内容的版权归原作者所有。生成的海报仅供个人纪念与分享，请勿用于商业用途。
