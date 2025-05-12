import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],
	build: {
		minify: true,
		chunkSizeWarningLimit: 1000,
		sourcemap: mode !== 'production',
	},
	css: {
		devSourcemap: true,
	},
	resolve: {
		alias: {
			'countup.js': path.resolve('./node_modules/.pnpm/countup.js@2.8.2/node_modules/countup.js/dist/countUp.js')
		}
	},
	// Add Node.js polyfills for Cloudflare compatibility
	server: {
		fs: {
			allow: ['.']
		}
	},
	// Provide empty shims for Node.js built-in modules
	define: {
		'process.env': {}
	},
	// Provide empty implementations for Node.js modules that don't work in browsers
	optimizeDeps: {
		esbuildOptions: {
			define: {
				global: 'globalThis'
			}
		}
	},
	ssr: {
		noExternal: ['@popperjs/core']
	}
}));
