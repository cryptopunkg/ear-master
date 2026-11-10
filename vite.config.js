import { defineConfig } from 'vite';

// base 用相对路径，方便部署到任意目录（含 GitHub Pages 子目录 / 局域网静态目录）
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    // 音色库与 worklet 处理器在 public/ 中，构建时原样拷贝
  },
});
