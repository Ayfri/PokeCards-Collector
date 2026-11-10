import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { Breadcrumb, Image, SeoType, UserProfile } from '#lib/types.js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			user: User | null;
			profile: UserProfile | null;
		}
		/** Fields every load inherits from the root layout. The catalogue is not among them: grid pages stream it under `streamed` in their own data. */
		interface PageData {
			breadcrumbs?: Breadcrumb[];
			/** Root-relative canonical, set when the request path is not the document's own URL: a `?set=` grid, a card whose slug arrived percent-encoded another way. */
			canonical?: string;
			description: string;
			image: Image;
			keywords?: string[];
			/** Set by user-owned and utility routes so they never reach the index. */
			noindex?: boolean;
			profile: UserProfile | null;
			/** Extra JSON-LD nodes the page merges into the site `@graph`. */
			schemas?: Record<string, unknown>[];
			title: string;
			type?: SeoType;
			user: User | null;
		}
	}

	namespace Cloudflare {
		interface Env {
			/** The static assets of the Worker (`[assets] binding` in `wrangler.toml`); absent under `vite dev`. */
			ASSETS?: Fetcher;
		}
	}

	interface Window {
		/** Loaded from a CDN script tag on the guess-the-price page only, so it is absent everywhere else. */
		confetti?: (options: { origin?: { x?: number; y?: number }; particleCount?: number; spread?: number }) => void;
	}

	namespace NodeJS {
		interface ProcessEnv {
			POKEMON_TCG_API_KEY: string;
		}
	}
}

export {};
