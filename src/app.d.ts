// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { UserProfile, Set } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			user: User | null;
			profile: UserProfile | null;
		}
		// Fields every load inherits from the root layout. Cards and prices are streamed,
		// so they live under `streamed` in the layout data rather than here.
		interface PageData {
			description: string;
			image: {
				alt: string;
				url: string;
			};
			profile: UserProfile | null;
			sets: Set[];
			title: string;
			user: User | null;
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
