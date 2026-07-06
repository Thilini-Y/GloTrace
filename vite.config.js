import { defineConfig } from 'vite';
import vueJsxPlugin from '@vitejs/plugin-vue-jsx';
 
export default defineConfig({
  plugins: [
    vueJsxPlugin(),
  ],
  server: {
    port: 8080,
  },
  build: {
    sourcemap: true,
    minify: false,
  },
});
 