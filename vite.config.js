import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 8080,
        open: true,
    },
    // Enable multi-page app mode
    appType: 'mpa',
    plugins: [
        {
            name: 'ads-redirect',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    // Redirect /ads to /ads/ for clean URLs
                    if (req.url === '/ads') {
                        res.writeHead(302, { Location: '/ads/' });
                        res.end();
                        return;
                    }
                    next();
                });
            }
        }
    ],
    build: {
        outDir: 'dist',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                ads: resolve(__dirname, 'ads/index.html'),
            },
            output: {
                manualChunks: {
                    three: ['three'],
                },
            },
        },
    },
});
