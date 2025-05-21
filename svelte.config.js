import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		dev: process.env.NODE_ENV === 'development',
		immutable: true,
	},
	kit: {
		adapter: adapter(),
		alias: {
			'@components': 'src/lib/components/*',
			'$helpers': 'src/lib/helpers/*',
			'$stores': 'src/lib/stores/*',
			'$scrapers': 'src/scrapers/*',
			'~': 'src/*',
		},
	},
	preprocess: vitePreprocess(),
};

export default config;
