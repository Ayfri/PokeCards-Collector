/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		fontFamily: {
			'clash': ['Clash Display', 'sans-serif'],
		},
		extend: {
			colors: {
				'gold': {
					'400': '#fbc54a',
				},
				'gray': {
					'400': '#aeaeae',
					'800': '#232323',
				},
			},
			screens: {
				'xs': '420px',
				'2xs': '350px',
			},
		},
	},
	plugins: [],
};
