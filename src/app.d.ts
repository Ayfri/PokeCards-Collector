// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
	namespace App {
		interface PageData {
			title: string;
			description: string;
			image: {
				url: string;
				alt: string;
			};
		}
	}

	namespace NodeJS {
		interface ProcessEnv {
			POKEMON_TCG_API_KEY: string;
		}
	}
}

export {};
