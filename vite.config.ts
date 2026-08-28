import {sveltekit} from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => ({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		minify: true,
		chunkSizeWarningLimit: 1000,
		sourcemap: false,
	},
	css: {
		devSourcemap: mode === 'development',
	},
	// Add Node.js polyfills for Cloudflare compatibility
	server: {
		fs: {
			allow: ['.'],
		},
	},
	// Provide empty shims for Node.js built-in modules
	define: {
		'process.env': {},
	},
	// Provide empty implementations for Node.js modules that don't work in browsers
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis',
			},
		},
	},
	ssr: {
		noExternal: ['@popperjs/core'],
	},
}));
