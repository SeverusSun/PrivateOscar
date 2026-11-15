# 部署说明

## 1. 本地构建

```bash
cd app && npm ci && npm run build
cd server && npm ci && npm run build
```

上传 `app/dist/` 到服务器 `/var/www/privateoscar/`，上传后端源码、`package.json`、锁文件、`prisma/` 与编译后的 `dist/` 到 `/opt/privateoscar-api/`。不要上传本地 SQLite 测试库或测试图片。

## 2. 准备数据目录和账号

创建专用系统账号及以下目录，并确保该账号只有必要的读写权限：

```text
/var/lib/privateoscar/db/privateoscar.db
/var/lib/privateoscar/uploads/
```

数据库和图片目录都在 Nginx 静态站点目录之外。临时服务器也必须把这两处定期备份到服务器之外，否则释放服务器会永久丢失社区数据。

## 3. 初始化数据库与后端

在 `/opt/privateoscar-api` 安装依赖，并使用生产环境变量执行迁移；迁移完成后可移除开发依赖：

```bash
npm ci
npx prisma migrate deploy
npm prune --omit=dev
```

参考 `privateoscar-api.service.example` 创建 systemd 服务。示例假定 Node.js 位于 `/usr/bin/node`，部署前应按实际路径调整。服务只监听 `127.0.0.1:3100`，不要向公网开放该端口。

## 4. 配置 Nginx 与 HTTPS

参考 `nginx.conf.example`：静态页面继续由 Nginx 托管，`/api/community/` 转发到后端，原有四条豆瓣代理保持不变。单张 JPEG 限制为 25 MB，Nginx 的 multipart 请求体限制设为 27 MB。

测试阶段可以使用 IP + HTTP；正式开放注册、上传和点赞前应配置域名与 HTTPS，并保持 `COOKIE_SECURE=true`。

## 5. 更新顺序

1. 备份数据库和上传目录。
2. 构建并上传前端、后端和新的 Prisma migration。
3. 执行 `npx prisma migrate deploy`。
4. 重启 `privateoscar-api`。
5. 检查 `/api/community/health`、上传、点赞和统计页面。

## 6. 备份

不要直接复制正在写入的 SQLite 主文件。使用 SQLite 的在线备份命令生成一致性快照，再备份快照与整个 `uploads/` 目录。建议每天至少一次，并将副本保存到对象存储或另一台机器。
