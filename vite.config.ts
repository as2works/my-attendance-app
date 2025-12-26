import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // AWS Amplify の環境変数をブラウザ側で利用可能にするための設定
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
  }
});