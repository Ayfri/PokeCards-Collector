// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserProfile } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			user: User | null;
			profile: UserProfile | null;
		}
		interface PageData {
			title: string;
			description: string;
			image: {
				url: string;
				alt: string;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}

	namespace NodeJS {
		interface ProcessEnv {
			POKEMON_TCG_API_KEY: string;
		}
	}
}

export {};
