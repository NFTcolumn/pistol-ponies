import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 8080,
        open: true,
    },
    build: {
        outDir: 'dist',
        chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
        rollupOptions: {
            output: {
                manualChunks: {
                    // Split Three.js into its own chunk for better caching
                    three: ['three'],
                },
            },
        },
    },
});
