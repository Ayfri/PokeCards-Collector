import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		minify: true,
	},
	css: {
		devSourcemap: true,
	},
	resolve: {
		alias: {
			'countup.js': path.resolve('./node_modules/.pnpm/countup.js@2.8.2/node_modules/countup.js/dist/countUp.js')
		}
	}
});
