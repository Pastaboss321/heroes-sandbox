import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` bundles everything (game, PixiJS, CSS) into one dist/index.html
// so the game can still be shared as a single file.
export default defineConfig({
  server: { port: 5173 },
  plugins: [viteSingleFile()],
});
