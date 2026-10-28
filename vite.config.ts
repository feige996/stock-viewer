import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const eastmoneyHeaders = {
  Referer: 'https://quote.eastmoney.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
  Connection: 'close',
}

const configureCloseConnection = (proxy: any) => {
  proxy.on('proxyReq', (proxyReq: any) => {
    proxyReq.setHeader('Connection', 'close')
    proxyReq.setHeader('Referer', 'https://quote.eastmoney.com/')
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    proxyReq.setHeader('Accept', '*/*')
    proxyReq.setHeader('Accept-Encoding', 'identity')
  })
}

const proxyConfig = {
  '/api/em-his': {
    target: 'http://push2his.eastmoney.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/em-his/, ''),
    headers: eastmoneyHeaders,
    configure: configureCloseConnection,
  },
  '/api/em-push': {
    target: 'http://push2.eastmoney.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/em-push/, ''),
    headers: eastmoneyHeaders,
    configure: configureCloseConnection,
  },
  '/api/em-search': {
    target: 'http://searchapi.eastmoney.com',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/em-search/, ''),
    headers: {
      Referer: 'https://quote.eastmoney.com/',
    },
  },
  '/api/tencent-kline': {
    target: 'https://web.ifzq.gtimg.cn',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/tencent-kline/, ''),
    headers: {
      Referer: 'https://gu.qq.com',
    },
  },
  '/api/tencent': {
    target: 'http://qt.gtimg.cn',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/tencent/, ''),
    headers: {
      Referer: 'https://gu.qq.com',
    },
  },
  '/api/sina': {
    target: 'https://money.finance.sina.com.cn',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/sina/, ''),
    headers: {
      Referer: 'https://finance.sina.com.cn',
    },
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 30413,
    proxy: proxyConfig,
  },
  preview: {
    port: 30413,
    proxy: proxyConfig,
  },
})
