import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    proxy: {
      // 豆瓣移动端公开接口代理（解决跨域与 Referer 校验）
      '/api/douban': {
        target: 'https://m.douban.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/douban/, '/rexxar/api/v2'),
        headers: {
          Referer: 'https://m.douban.com/',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        },
      },
      // 豆瓣图片直连代理（导出海报时避免跨域污染画布）
      '/api/img': {
        target: 'https://img1.doubanio.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/img/, ''),
        headers: { Referer: 'https://www.douban.com/' },
      },
      // 豆瓣网页版代理（获取完整书影音历史，移动端接口有数量上限）
      '/api/douban-www': {
        target: 'https://www.douban.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/douban-www/, ''),
        headers: {
          Referer: 'https://www.douban.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        },
      },
      '/api/douban-movie': {
        target: 'https://movie.douban.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/douban-movie/, ''),
        headers: {
          Referer: 'https://movie.douban.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
