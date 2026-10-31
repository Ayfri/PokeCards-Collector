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
	server: {
		fs: {
			allow: ['.'],
		},
	},
	define: {
		'process.env': {},
	},
	ssr: {
		noExternal: ['@popperjs/core'],
	},
}));
