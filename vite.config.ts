import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { getHeaders, writeBuildHeaders } = createRequire(import.meta.url)('./scripts/security-headers.cjs');
const { previewCachePlugin } = createRequire(import.meta.url)('./scripts/cache-headers.cjs');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load environment variables (Vite prefixes env vars with VITE_)
    const env = loadEnv(mode, process.cwd(), '');
    // A Ziquala backend proxy must be explicitly configured for this project.
    const apiProxy = env.VITE_API_PROXY
        ? {
            '/api': {
                target: env.VITE_API_PROXY,
                changeOrigin: true,
                secure: false,
                rewrite: (requestPath: string) => requestPath
            }
        }
        : undefined;

    return {
        plugins: [react(), {
            name: 'ziquala-security-headers',
            apply: 'build',
            closeBundle() { writeBuildHeaders(env.VITE_API_URL); }
        }, previewCachePlugin()],

        // Build configuration
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            // Keep the small shared logo independently cacheable after compression.
            assetsInlineLimit: filePath => filePath.endsWith('school-logo.webp') ? false : undefined,
            // Generate source maps for debugging
            sourcemap: false,
            manifest: true,
            // Optimize chunk size
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                output: {
                    // Manual chunk splitting for better caching
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            const modulePath = id.replace(/\\/g, '/');
                            if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(modulePath)) {
                                return 'react-vendor';
                            }
                            if (id.includes('lucide-react')) {
                                return 'ui-vendor';
                            }
                            if (id.includes('zustand')) {
                                return 'state-vendor';
                            }
                            if (id.includes('i18next') || id.includes('react-i18next')) {
                                return 'i18n-vendor';
                            }
                        }
                    },
                    // Ensure consistent asset naming
                    assetFileNames: (assetInfo) => {
                        const info = assetInfo.name?.split('.') || [];
                        const ext = info[info.length - 1];
                        if (/png|jpe?g|webp|avif|svg|gif|tiff|bmp|ico/i.test(ext)) {
                            return `assets/images/[name]-[hash][extname]`;
                        } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
                            return `assets/fonts/[name]-[hash][extname]`;
                        }
                        return `assets/[name]-[hash][extname]`;
                    },
                    chunkFileNames: 'assets/[name]-[hash].js',
                    entryFileNames: 'assets/[name]-[hash].js'
                }
            }
        },

        server: {
            port: 5173,
            host: true,
            strictPort: false,
            proxy: apiProxy
        },

        // Preview server configuration
        preview: {
            // Exercise exactly the headers emitted for this build, including its API origin.
            headers: fs.existsSync(path.join(__dirname, 'dist/security-headers.json'))
                ? JSON.parse(fs.readFileSync(path.join(__dirname, 'dist/security-headers.json'), 'utf8'))
                : getHeaders(env.VITE_API_URL),
            port: 4173,
            host: true,
            strictPort: false
        },

        // Path resolution
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@context': path.resolve(__dirname, './src/context'),
                '@assets': path.resolve(__dirname, './src/assets')
            }
        },

        // Optimize dependencies
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'framer-motion']
        },

        // Base path - set to './' for relative paths (important for deployment)
        base: '/'
    };
});
