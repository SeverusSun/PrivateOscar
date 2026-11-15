# Private_Oscar（私人奥斯卡）

基于你的豆瓣书影音档案，举办一场完全属于你自己的电影奥斯卡，生成可以分享的专属海报，并在主动上传后与「人人奥斯卡」社区交流。

A personal "Academy Awards" website: import your Douban movie archive, nominate winners, rank your Top movies, export shareable posters, and optionally publish them to a community gallery.

**本地优先：影库和评选进度默认只保存在浏览器 localStorage，不会自动上传。只有主动上传的海报、用户名、评选结果及颁奖词会公开展示，豆瓣 UID 不公开展示。**

## 界面一览

| 界面 | 说明 | 详细文档 |
|---|---|---|
| 同步 | 抓取豆瓣账户「想看 / 在看 / 看过」的全部电影词条，可手动补录遗漏影片 | [同步](docs/同步.md) |
| 影库 | 浏览与筛选已同步的词条，查看详情、修改评分与影评、手动补录 | [影库](docs/影库.md) |
| 评选 | 举办私人奥斯卡（38 个内置奖项 + 自定义奖项），或排出 Top N 片单 | [评选](docs/评选.md) |
| 奥斯卡 | 导出主海报与完整提名名单，并可主动上传 | [奥斯卡](docs/奥斯卡.md) |
| Top榜 | 导出「Top N」榜单图片，并可主动上传 | [Top榜](docs/Top榜.md) |
| 人人奥斯卡 | 海报筛选展示、点赞，以及各奖项与各 Top 类别前十名 | [人人奥斯卡](docs/人人奥斯卡.md) |
| 关于 | 站点信息、功能一览、数据与隐私、作者信息 | [关于](docs/关于.md) |

## 界面设计

- **整体风格**：仿豆瓣的绿色基调（豆瓣绿 `#007722`），衬线字体，简洁卡片式布局。
- **海报配色**：获奖烫金 `#c9a227`、提名墨绿 `#1b4332`、豆瓣评分橙 `#e09015`；Top 榜前三名使用金银铜三色。
- **交互细节**：提示消息从底部浮出；奖项/名次支持拖拽排序；上传冲突时可选择覆盖并清零点赞，或上传独立结果。

## 快速开始

前端：

```bash
cd app
npm install
npm run dev
```

社区后端（另开终端）：

```bash
cd server
npm install
cp .env.example .env       # Windows 可手动复制该文件
npm run db:migrate
npm run dev
```

浏览器访问 `http://localhost:3000`。Vite 将 `/api/community` 代理到 `127.0.0.1:3100`，豆瓣接口继续使用原有代理。

## 测试与构建

```bash
cd app && npm test && npm run build
cd server && npm test && npm run build
```

前端产物在 `app/dist`，后端编译产物在 `server/dist`。生产部署、Nginx、systemd、数据目录和备份方法见 [部署说明](deploy/README.md)。

## 技术栈

- 前端：Vite · React 19 · TypeScript · Tailwind CSS · shadcn/ui · React Router · html-to-image
- 社区后端：Node.js · Fastify · Prisma · SQLite · Zod · Sharp
- 数据：完整版本化评选 JSON + 可查询的统计条目 + 文件系统 JPEG/缩略图
- 标识：评选和图片使用 UUID；JPEG 只在标准 EXIF `ImageUniqueID` 中写入图片 UUID

## 免责声明

本站为非商业个人项目；电影海报、评分等内容的版权归原作者所有。生成的海报仅供个人纪念与分享，请勿用于商业用途。
