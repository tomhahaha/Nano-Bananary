import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        host: '0.0.0.0', // 监听所有网卡，支持IP访问
        port: 5173,
        strictPort: true, // 如果端口被占用则退出
        cors: true // 启用CORS
      },
      preview: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true
      }
    };
});
