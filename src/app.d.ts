// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { UserProfile, Card, Set, PriceData } from '$lib/types';

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
			allCards: Card[];
			sets: Set[];
			prices: Record<string, PriceData>;
			user: User | null;
			profile: UserProfile | null;
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
