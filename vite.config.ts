import adapter from '@sveltejs/adapter-cloudflare';
import {sveltekit} from '@sveltejs/kit/vite';
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => ({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			onwarn: (warning, handler) => {
				if (warning.code.startsWith('a11y_')) {
					return;
				}
				handler(warning);
			},
			preprocess: vitePreprocess(),
		}),
	],
	build: {
		minify: true,
		chunkSizeWarningLimit: 1000,
		sourcemap: false,
	},
	css: {
		devSourcemap: mode === 'development',
	},
	server: {
		fs: {
			allow: ['.'],
		},
	},
	define: {
		'process.env': {},
	},
	ssr: {
		/** Kit 3 needs `cookie` 2 while `@supabase/ssr` hoists `cookie` 1 to the root, so Kit's copy is inlined instead of resolved from `.svelte-kit/output`. */
		noExternal: ['@popperjs/core', 'cookie'],
	},
}));
