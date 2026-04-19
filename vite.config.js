import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5501 },
  test: {
    // Run tests in Node (no browser). Phaser scenes are not tested here yet.
    environment: 'node',
  },
});
