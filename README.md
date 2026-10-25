<<<<<<< HEAD
# Private_Oscar（私人奥斯卡）

This is one website that allows users to import personal Douban account,nominate their private Oscar and Top adwards and generate social-media propaganda posters.

基于你的豆瓣书影音档案，举办一场完全属于你自己的电影奥斯卡，并生成可以分享的专属海报。

数据仅保存在你自己的浏览器本地（localStorage），不经过任何服务器，不上传、不分享。

## 功能

- **同步**：输入豆瓣用户 ID 或主页链接，抓取「想看 / 在看 / 看过」的全部电影词条（海报、评分、记录时间、个人打分、短评、长评）
- **影库**：卡片 / 列表两种模式，支持状态、年份、豆瓣评分区间、我的星级、关键词多重筛选
- **评选**：
  - 「奥斯卡」模式：23 个必选奖项 + 14 个可选奖项 + 自定义奖项，提名、颁奖、颁奖词（文本输入 > 电影短评 > 奖项说明）
  - 「Top 榜」模式：按名次排出 Top N 片单（前三名金银铜色调），导演类别自动匹配导演照片
- **奥斯卡**：导出主海报与完整名单（获奖烫金、提名墨绿）
- **Top榜**：导出「Top N」榜单图片
- **关于**：站点信息、使用说明与作者信息

## 快速开始

```bash
cd app
npm install
npm run dev
```

浏览器访问终端中输出的地址（例如 `http://localhost:3000`）。

## 构建

```bash
npm run build   # 产物在 app/dist
```

## 技术栈

豆瓣数据经本地 Vite 代理获取（解决跨域与 Referer 校验），海报图同样走代理以便导出画布；海报由 DOM 离线渲染导出，字体使用系统楷体。

## 详细说明

见 [使用说明.md](使用说明.md)。

## 免责声明

本站为非商业个人项目，与豆瓣无关；电影海报、评分等内容的版权归原作者所有。生成的海报仅供个人纪念与分享，请勿用于商业用途。
=======

