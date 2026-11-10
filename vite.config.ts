import adapter from '@sveltejs/adapter-cloudflare';
import {sveltekit} from '@sveltejs/kit/vite';
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => ({
	build: {
		chunkSizeWarningLimit: 1000,
		minify: true,
	},
	css: {
		devSourcemap: mode === 'development',
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			onwarn: (warning, handler) => { if (!warning.code.startsWith('a11y_')) handler(warning); },
			preprocess: vitePreprocess(),
		}),
	],
	server: {
		fs: {
			allow: ['.'],
		},
	},
	ssr: {
		/** Kit 3 needs `cookie` 2 while `@supabase/ssr` hoists `cookie` 1 to the root, so Kit's copy is inlined instead of resolved from `.svelte-kit/output`. */
		noExternal: ['cookie'],
	},
}));
