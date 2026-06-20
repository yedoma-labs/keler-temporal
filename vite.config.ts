import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const entries = {
  index: resolve(__dirname, 'src/index.ts'),
  'compat/index': resolve(__dirname, 'src/compat/index.ts'),
  'testing/index': resolve(__dirname, 'src/testing/index.ts'),
  'adapters/moment': resolve(__dirname, 'src/adapters/moment.ts'),
  'adapters/luxon': resolve(__dirname, 'src/adapters/luxon.ts'),
  'adapters/dayjs': resolve(__dirname, 'src/adapters/dayjs.ts'),
};

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/__tests__/**'],
      outDirs: ['dist', { dir: 'dist', moduleFormat: 'cjs' }],
      entryRoot: resolve(__dirname, 'src'),
      beforeWriteFile(filePath, content) {
        const fixed = filePath.replace('/dist/src/', '/dist/');
        if (fixed !== filePath) console.log('[dts] path fix:', filePath, '->', fixed);
        return { filePath: fixed, content };
      },
    }),
  ],
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    target: 'node22',
    minify: false,
    sourcemap: true,
  },
});
