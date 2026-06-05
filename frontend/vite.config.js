import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import path from 'path'
import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export default defineConfig(({ mode, command }) => {
  const isWidget = mode === 'widget'
  const appPath = isWidget ? 'apps/widget' : 'apps/main'

  // Load shared tailwind config but scope content to current app only,
  // so each app's CSS bundle doesn't include unused classes from the other.
  const tailwindConfig = require('./tailwind.config.cjs')
  const scopedContent = [
    `./apps/${isWidget ? 'widget' : 'main'}/src/**/*.{js,ts,vue}`,
    './shared-ui/**/*.{js,ts,vue}'
  ]

  return {
    base: isWidget && command === 'build' ? '/widget/' : '/',
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern'
        }
      },
      postcss: {
        plugins: [tailwind({ ...tailwindConfig, content: scopedContent }), autoprefixer()]
      }
    },
    root: path.resolve(__dirname, appPath),
    // Load .env from the frontend/ dir (shared by both apps), not from each app's `root`.
    envDir: __dirname,
    publicDir: path.resolve(__dirname, 'public'),
    // Separate cache per app to avoid stale/conflicting caches.
    cacheDir: path.resolve(__dirname, `node_modules/.vite-${isWidget ? 'widget' : 'main'}`),
    server: {
      cors: { origin: '*' },
      // Allow access to parent dir so shared-ui imports work in dev.
      fs: {
        allow: [path.resolve(__dirname)]
      },
      port: isWidget ? 8001 : 8000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true
        },
        '/widget.js': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true
        },
        '/logout': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true
        },
        '/uploads': {
          target: 'http://127.0.0.1:9000',
          changeOrigin: true
        },
        '/ws': {
          target: 'ws://127.0.0.1:9000',
          ws: true,
          changeOrigin: true
        },
        '/widget/ws': {
          target: 'ws://127.0.0.1:9000',
          ws: true,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: isWidget
        ? path.resolve(__dirname, 'dist/widget')
        : path.resolve(__dirname, 'dist/main'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (['vue', '@vue', 'vue-router', 'pinia'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'vue-vendor'
            if (['radix-vue', 'reka-ui'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'radix'
            if (['lucide-vue-next', '@radix-icons'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'icons'
            if (['clsx', 'tailwind-merge', 'class-variance-authority'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'utils'
            if (['vee-validate', 'zod'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'forms'
            if (['axios', 'date-fns', 'mitt', 'qs', 'vue-i18n'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'misc'
            if (!isWidget) {
              if (['@unovis'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'charts'
              if (['@tiptap'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'editor'
              if (['codemirror', '@codemirror'].some(p => id.includes(`/node_modules/.pnpm/${p}`))) return 'codemirror'
              if (id.includes('/node_modules/.pnpm/@tanstack+vue-table')) return 'table'
            }
          }
        }
      }
    },
    plugins: [vue()],
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': path.resolve(__dirname, `${appPath}/src`),
        '@main': path.resolve(__dirname, 'apps/main/src'),
        '@widget': path.resolve(__dirname, 'apps/widget/src'),
        '@shared-ui': path.resolve(__dirname, 'shared-ui'),
        ...(isWidget && {
          '@icons': path.resolve(__dirname, 'apps/widget/src/ui/icons'),
          '@parts': path.resolve(__dirname, 'apps/widget/src/ui/parts'),
          '@actions': path.resolve(__dirname, 'apps/widget/src/core/actions'),
          '@store': path.resolve(__dirname, 'apps/widget/src/core/store/store'),
          '@types': path.resolve(__dirname, 'apps/widget/src/core/types'),
          '@utils': path.resolve(__dirname, 'apps/widget/src/utils'),
        }),
      }
    }
  }
})
